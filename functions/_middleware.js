// Site-wide password gate. Runs before every request, static assets included.
// Without a valid session cookie a visitor only gets the login page and the few
// public files it (and link previews) need; everything else redirects to /login.
//
// Secrets (Cloudflare Pages env / local .dev.vars):
//   SITE_PASSWORD         shared password guests type in. Changing it logs everyone out.
//   TURNSTILE_SECRET_KEY  verifies the Turnstile challenge on the login form.

import { sha256, toHex, timingSafeEqual, getCookie } from "../lib/security.js";

const COOKIE_NAME = "spd_session";
const SESSION_DAYS = 365; // browsers stay logged in ~a year; rotating SITE_PASSWORD logs everyone out
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const PUBLIC_PATHS = new Set([
    "/login",
    "/login.html",
    "/config.js",
    "/robots.txt",
    "/css/style.css",
    "/assets/images/favicon.png",
    "/assets/images/cover.png",
    "/assets/images/invite.jpg", // link-preview image (shows city only, never the address)
    "/assets/images/Star.svg"
]);
const PUBLIC_PREFIXES = ["/assets/fonts/"];

const encoder = new TextEncoder();

// Keyed off the password so rotating it invalidates every existing session.
async function sessionKey(env) {
    const material = await sha256(`spd-session-v1:${env.SITE_PASSWORD}`);
    return crypto.subtle.importKey("raw", material, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function createSession(env) {
    const exp = String(Date.now() + SESSION_DAYS * 86400 * 1000);
    const sig = await crypto.subtle.sign("HMAC", await sessionKey(env), encoder.encode(exp));
    return `${exp}.${toHex(new Uint8Array(sig))}`;
}

async function hasValidSession(request, env) {
    if (!env.SITE_PASSWORD) return false;
    const value = getCookie(request, COOKIE_NAME);
    if (!value) return false;
    const [exp, sig] = value.split(".");
    if (!/^\d+$/.test(exp || "") || Number(exp) < Date.now()) return false;
    if (!/^[0-9a-f]{64}$/.test(sig || "")) return false;
    const sigBytes = new Uint8Array(sig.match(/../g).map(h => parseInt(h, 16)));
    return crypto.subtle.verify("HMAC", await sessionKey(env), sigBytes, encoder.encode(exp));
}

async function verifyTurnstile(secret, token, ip) {
    const form = new FormData();
    form.append("secret", secret);
    form.append("response", token);
    if (ip) form.append("remoteip", ip);
    const res = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body: form });
    if (!res.ok) return false;
    const data = await res.json();
    return data.success === true;
}

// Only same-site paths, never protocol-relative (//evil.com) or back to the login page.
function safeNext(value) {
    if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
    if (value.startsWith("/login")) return "/";
    return value;
}

function redirect(location, extraHeaders = {}) {
    return new Response(null, { status: 303, headers: { location, "cache-control": "no-store", ...extraHeaders } });
}

function loginRedirect(error, next) {
    const params = new URLSearchParams({ error });
    if (next !== "/") params.set("next", next);
    return redirect(`/login?${params}`);
}

async function handleLogin(request, env) {
    let form;
    try {
        form = await request.formData();
    } catch {
        return loginRedirect("invalid", "/");
    }
    const next = safeNext(form.get("next"));

    if (!env.SITE_PASSWORD || !env.TURNSTILE_SECRET_KEY) return loginRedirect("config", next);

    const token = (form.get("cf-turnstile-response") || "").toString();
    if (!token) return loginRedirect("verify", next);
    const ip = request.headers.get("CF-Connecting-IP") || "";
    if (!(await verifyTurnstile(env.TURNSTILE_SECRET_KEY, token, ip))) return loginRedirect("verify", next);

    const password = (form.get("password") || "").toString().trim();
    const ok = timingSafeEqual(await sha256(password), await sha256(env.SITE_PASSWORD.trim()));
    if (!ok) return loginRedirect("password", next);

    const cookie = `${COOKIE_NAME}=${await createSession(env)}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`;
    return redirect(next, { "set-cookie": cookie });
}

export async function onRequest({ request, env, next }) {
    const url = new URL(request.url);

    if (url.pathname === "/api/login") {
        if (request.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405, headers: { allow: "POST" } });
        }
        return handleLogin(request, env);
    }

    if (url.pathname === "/api/logout") {
        return redirect("/login", { "set-cookie": `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` });
    }

    if (await hasValidSession(request, env)) {
        if (url.pathname === "/login" || url.pathname === "/login.html") return redirect("/");
        return next();
    }

    if (PUBLIC_PATHS.has(url.pathname) || PUBLIC_PREFIXES.some(p => url.pathname.startsWith(p))) {
        return next();
    }

    if (url.pathname.startsWith("/api/")) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json", "cache-control": "no-store" }
        });
    }

    const params = new URLSearchParams();
    const wanted = url.pathname + url.search;
    if (wanted !== "/") params.set("next", wanted);
    return Response.redirect(new URL(`/login${params.size ? `?${params}` : ""}`, url).toString(), 302);
}
