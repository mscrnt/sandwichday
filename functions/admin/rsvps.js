// /admin/rsvps          host view of every RSVP (HTML)
// /admin/rsvps?format=csv  spreadsheet download
// POST /admin/rsvps     delete one RSVP (id) - for duplicates or tests
//
// Behind the site password (middleware) AND HTTP Basic auth with the ADMIN_PASSWORD secret
// (any username). Guests know the site password, so this second one must be different.

import { secretsMatch } from "../../lib/security.js";
import { ensureSchema, FAILED_LOGIN_DAYS } from "../../lib/db.js";

const EMPTY_MESSAGE = "No RSVPs yet.";

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Guest-supplied text inside an inline JS string: keep only letters, digits and spaces
function confirmName(value) {
    return String(value ?? "").replace(/[^\p{L}\p{N} ]/gu, "");
}

function csvCell(value) {
    let s = String(value ?? "");
    if (/^[=+\-@]/.test(s)) s = `'${s}`; // spreadsheets would run these as formulas
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function isAdmin(request, env) {
    if (!env.ADMIN_PASSWORD) return false;
    const header = request.headers.get("Authorization") || "";
    if (!header.startsWith("Basic ")) return false;
    let decoded;
    try {
        decoded = atob(header.slice(6));
    } catch {
        return false;
    }
    const password = decoded.slice(decoded.indexOf(":") + 1);
    return secretsMatch(password, env.ADMIN_PASSWORD);
}

function unauthorized() {
    return new Response("Admin password required", {
        status: 401,
        headers: { "www-authenticate": 'Basic realm="Sandwich Day RSVPs", charset="UTF-8"', "cache-control": "no-store" }
    });
}

async function loadRows(env) {
    const { results } = await env.DB.prepare(
        "SELECT id, name, attending, guests, bringing, dietary, created_at, updated_at FROM rsvps ORDER BY attending = 'no', created_at"
    ).all();
    return results;
}

// Wrong passwords tried on the login page, grouped so repeated typos show once
async function loadFailedLogins(env) {
    const { results } = await env.DB.prepare(
        `SELECT attempt, COUNT(*) AS tries, MAX(created_at) AS last_try, GROUP_CONCAT(DISTINCT country) AS countries
         FROM failed_logins GROUP BY attempt ORDER BY last_try DESC LIMIT 100`
    ).all();
    return results;
}

function renderPage(rows, failedLogins) {
    const total = (status) => rows.filter(r => r.attending === status).reduce((n, r) => n + r.guests, 0);
    const label = { yes: "✅ Yes", maybe: "🤔 Maybe", no: "❌ No" };
    const body = rows.map(r => `
        <tr>
            <td>${escapeHtml(r.name)}</td>
            <td>${label[r.attending] || escapeHtml(r.attending)}</td>
            <td class="num">${r.attending === "no" ? "" : r.guests}</td>
            <td>${escapeHtml(r.bringing)}</td>
            <td>${escapeHtml(r.dietary)}</td>
            <td class="when">${escapeHtml(r.updated_at)} UTC</td>
            <td><form method="POST" onsubmit="return confirm('Delete ${confirmName(r.name)}?')">
                <input type="hidden" name="id" value="${r.id}"><button type="submit">Delete</button></form></td>
        </tr>`).join("");
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>RSVPs - Sandwich Day</title>
<style>
    body { font-family: system-ui, sans-serif; margin: 2em auto; max-width: 70em; padding: 0 1em; color: #080b12; background: #f3eee6; }
    h1 { margin-bottom: 0.2em; }
    .totals { display: flex; gap: 1em; flex-wrap: wrap; margin: 1em 0; }
    .totals div { background: #fff; border: 3px solid #080b12; border-radius: 8px; padding: 0.6em 1em; box-shadow: 4px 4px 0 #080b12; }
    .totals strong { font-size: 1.6em; display: block; }
    .wrap { overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; background: #fff; }
    th, td { border: 1px solid #c9c2b6; padding: 0.5em 0.7em; text-align: left; vertical-align: top; }
    th { background: #82c3e4; }
    .num { text-align: right; }
    .when { white-space: nowrap; font-size: 0.85em; color: #555; }
    button { cursor: pointer; }
    a.csv { display: inline-block; margin-bottom: 1em; }
    h2 { margin-top: 2em; }
    .note { color: #555; margin-top: 0; }
</style>
</head>
<body>
    <h1>🥪 Sandwich Day RSVPs</h1>
    <div class="totals">
        <div><strong>${total("yes")}</strong>people coming</div>
        <div><strong>${total("maybe")}</strong>maybe</div>
        <div><strong>${rows.filter(r => r.attending === "no").length}</strong>can't make it</div>
        <div><strong>${rows.length}</strong>RSVPs total</div>
    </div>
    <a class="csv" href="?format=csv">⬇ Download as spreadsheet (CSV)</a>
    <div class="wrap">
    <table>
        <thead><tr><th>Name</th><th>Coming?</th><th>People</th><th>Bringing</th><th>Dietary / allergies</th><th>Last updated</th><th></th></tr></thead>
        <tbody>${body || `<tr><td colspan="7">${EMPTY_MESSAGE}</td></tr>`}</tbody>
    </table>
    </div>

    <h2>🔒 Wrong passwords tried</h2>
    <p class="note">Only attempts that passed the bot check. Kept ${FAILED_LOGIN_DAYS} days, then deleted automatically.</p>
    <div class="wrap">
    <table>
        <thead><tr><th>Typed</th><th>Times</th><th>Country</th><th>Last try</th></tr></thead>
        <tbody>${failedLogins.map(f => `
        <tr>
            <td><code>${escapeHtml(f.attempt)}</code></td>
            <td class="num">${f.tries}</td>
            <td>${escapeHtml(f.countries)}</td>
            <td class="when">${escapeHtml(f.last_try)} UTC</td>
        </tr>`).join("") || `<tr><td colspan="4">No wrong passwords so far.</td></tr>`}</tbody>
    </table>
    </div>
</body>
</html>`;
}

export async function onRequest({ request, env }) {
    if (!(await isAdmin(request, env))) return unauthorized();
    if (!env.DB) return new Response("RSVP database not configured", { status: 503 });

    const url = new URL(request.url);

    if (request.method === "POST") {
        // Same-site form posts only
        const origin = request.headers.get("Origin");
        if (origin && origin !== url.origin) return new Response("Forbidden", { status: 403 });
        const form = await request.formData();
        const id = Number(form.get("id"));
        if (Number.isInteger(id)) await env.DB.prepare("DELETE FROM rsvps WHERE id = ?").bind(id).run();
        return new Response(null, { status: 303, headers: { location: url.pathname } });
    }
    if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405 });

    await ensureSchema(env.DB);
    const rows = await loadRows(env);

    if (url.searchParams.get("format") === "csv") {
        const header = ["name", "attending", "people", "bringing", "dietary", "created_at_utc", "updated_at_utc"];
        const lines = rows.map(r => [r.name, r.attending, r.attending === "no" ? 0 : r.guests, r.bringing, r.dietary, r.created_at, r.updated_at].map(csvCell).join(","));
        return new Response([header.join(","), ...lines].join("\n") + "\n", {
            headers: {
                "content-type": "text/csv; charset=utf-8",
                "content-disposition": 'attachment; filename="sandwichday-rsvps.csv"',
                "cache-control": "no-store"
            }
        });
    }

    return new Response(renderPage(rows, await loadFailedLogins(env)), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
