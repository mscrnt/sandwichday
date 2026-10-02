// Shared helpers for the Pages Functions (bundled at build time, not served).

const encoder = new TextEncoder();

export async function sha256(input) {
    return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(input)));
}

export function toHex(bytes) {
    return [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
}

export function timingSafeEqual(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
}

// Compare two strings without leaking where they differ
export async function secretsMatch(given, expected) {
    return timingSafeEqual(await sha256(given), await sha256(expected));
}

export function getCookie(request, name) {
    const header = request.headers.get("Cookie") || "";
    for (const part of header.split(";")) {
        const [k, ...v] = part.trim().split("=");
        if (k === name) return v.join("=");
    }
    return null;
}

export function jsonResponse(body, status = 200, headers = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json", "cache-control": "no-store", ...headers }
    });
}
