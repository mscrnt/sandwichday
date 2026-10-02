// D1 schema for the DB binding (wrangler.toml). Tables are created on first use, so a
// fresh database (or next year's) needs no setup step.

const SCHEMA = [
    `CREATE TABLE IF NOT EXISTS rsvps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        attending TEXT NOT NULL,
        guests INTEGER NOT NULL DEFAULT 1,
        bringing TEXT NOT NULL DEFAULT '',
        dietary TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    // Wrong passwords typed on the login page (after passing Turnstile), for spotting typos.
    // Kept FAILED_LOGIN_DAYS, host-only (admin page), never sent to analytics.
    `CREATE TABLE IF NOT EXISTS failed_logins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        attempt TEXT NOT NULL,
        country TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
];

export const FAILED_LOGIN_DAYS = 60;

let schemaReady = null;
export function ensureSchema(db) {
    schemaReady ||= db.batch(SCHEMA.map(sql => db.prepare(sql))).catch(err => { schemaReady = null; throw err; });
    return schemaReady;
}

export async function recordFailedLogin(db, attempt, country) {
    await ensureSchema(db);
    await db.batch([
        db.prepare("INSERT INTO failed_logins (attempt, country) VALUES (?, ?)").bind(attempt.slice(0, 100), country || ""),
        db.prepare(`DELETE FROM failed_logins WHERE created_at < datetime('now', '-${FAILED_LOGIN_DAYS} days')`)
    ]);
}
