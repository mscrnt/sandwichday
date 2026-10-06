// GET  /api/rsvp  -> { mine, summary }   (this browser's RSVP + headcount and sides so far)
// POST /api/rsvp  -> create or update this browser's RSVP
// Logged-in guests only: functions/_middleware.js answers 401 for /api/* before this runs.
//
// Bindings / secrets:
//   DB                   D1 database (wrangler.toml); tables are created on first use (lib/db.js)
//   DISCORD_WEBHOOK_URL  optional: post each new or changed RSVP to a Discord channel

import { getCookie, jsonResponse } from "../../lib/security.js";
import { ensureSchema } from "../../lib/db.js";

const RSVP_COOKIE = "spd_rsvp";
const ATTENDING = ["yes", "maybe", "no"];
const MAX_GUESTS = 10;

function clean(value, max) {
    return (value ?? "").toString().replace(/\s+/g, " ").trim().slice(0, max);
}

function publicRsvp(row) {
    if (!row) return null;
    return { name: row.name, attending: row.attending, guests: row.guests, bringing: row.bringing, dietary: row.dietary };
}

async function summary(db) {
    const counts = await db.prepare(
        "SELECT attending, COUNT(*) AS rsvps, COALESCE(SUM(guests), 0) AS people FROM rsvps GROUP BY attending"
    ).all();
    const byStatus = Object.fromEntries(counts.results.map(r => [r.attending, r]));
    const sides = await db.prepare(
        "SELECT name, bringing FROM rsvps WHERE attending != 'no' AND bringing != '' ORDER BY created_at"
    ).all();
    return {
        coming: byStatus.yes?.people ?? 0,
        maybe: byStatus.maybe?.people ?? 0,
        sides: sides.results.map(r => ({ name: r.name.split(" ")[0], bringing: r.bringing }))
    };
}

async function notifyDiscord(env, rsvp, isUpdate) {
    if (!env.DISCORD_WEBHOOK_URL) return;
    const label = { yes: "is coming", maybe: "might come", no: "can't make it" }[rsvp.attending];
    const party = rsvp.attending !== "no" && rsvp.guests > 1 ? ` (party of ${rsvp.guests})` : "";
    const side = rsvp.bringing ? `, bringing ${rsvp.bringing}` : "";
    const content = `🥪 ${isUpdate ? "Updated RSVP" : "New RSVP"}: **${rsvp.name}** ${label}${party}${side}`;
    try {
        await fetch(env.DISCORD_WEBHOOK_URL, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ content, allowed_mentions: { parse: [] } })
        });
    } catch {
        // A failed notification must never fail the RSVP itself
    }
}

export async function onRequestGet({ request, env }) {
    if (!env.DB) return jsonResponse({ error: "rsvp_unavailable" }, 503);
    await ensureSchema(env.DB);
    const token = getCookie(request, RSVP_COOKIE);
    const mine = token ? await env.DB.prepare("SELECT * FROM rsvps WHERE token = ?").bind(token).first() : null;
    return jsonResponse({ mine: publicRsvp(mine), summary: await summary(env.DB) });
}

export async function onRequestPost({ request, env, waitUntil }) {
    if (!env.DB) return jsonResponse({ error: "rsvp_unavailable" }, 503);
    await ensureSchema(env.DB);

    let body;
    try {
        body = await request.json();
    } catch {
        return jsonResponse({ error: "invalid_body" }, 400);
    }

    const rsvp = {
        name: clean(body.name, 60),
        attending: clean(body.attending, 10),
        guests: Math.trunc(Number(body.guests)),
        bringing: clean(body.bringing, 120),
        dietary: clean(body.dietary, 200)
    };
    // A real name, not "Z" or "?": at least two letters
    if ((rsvp.name.match(/\p{L}/gu) || []).length < 2) return jsonResponse({ error: "missing_name" }, 400);
    if (!ATTENDING.includes(rsvp.attending)) return jsonResponse({ error: "invalid_attending" }, 400);
    if (rsvp.attending === "no") rsvp.guests = 0;
    else if (!Number.isFinite(rsvp.guests) || rsvp.guests < 1 || rsvp.guests > MAX_GUESTS) return jsonResponse({ error: "invalid_guests" }, 400);

    let token = getCookie(request, RSVP_COOKIE);
    const existing = token ? await env.DB.prepare("SELECT id FROM rsvps WHERE token = ?").bind(token).first() : null;

    if (existing) {
        await env.DB.prepare(
            "UPDATE rsvps SET name = ?, attending = ?, guests = ?, bringing = ?, dietary = ?, updated_at = datetime('now') WHERE id = ?"
        ).bind(rsvp.name, rsvp.attending, rsvp.guests, rsvp.bringing, rsvp.dietary, existing.id).run();
    } else {
        token = crypto.randomUUID();
        await env.DB.prepare(
            "INSERT INTO rsvps (token, name, attending, guests, bringing, dietary) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(token, rsvp.name, rsvp.attending, rsvp.guests, rsvp.bringing, rsvp.dietary).run();
    }

    waitUntil(notifyDiscord(env, rsvp, !!existing));

    // Lets this browser see and change its RSVP later
    const cookie = `${RSVP_COOKIE}=${token}; Path=/; Max-Age=${365 * 86400}; HttpOnly; Secure; SameSite=Lax`;
    return jsonResponse({ mine: rsvp, summary: await summary(env.DB) }, 200, { "set-cookie": cookie });
}
