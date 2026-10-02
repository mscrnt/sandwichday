// Runs once a year (see wrangler.toml) and reminds the host to update the site.

const CHECKLIST_URL = "https://github.com/mscrnt/sandwichday#yearly-checklist";

function reminderMessage(year, isTest) {
    return [
        `${isTest ? "🧪 (test) " : ""}🥪🎸 **Sandwich Day ${year} is coming up!** November is 60 days away, time to update scottpilgrimday.com.`,
        "",
        "• `event.conf`: new date, end and movie times; last year's date into `HISTORIC_DATE`; `SHOW_THANK_YOU_PAGE=false`",
        "• Cloudflare secrets: rotate `SITE_PASSWORD`, update the address / venue",
        "• Clear last year's RSVPs at scottpilgrimday.com/admin/rsvps",
        "• Check the Discord invite link still works, re-render the invite image",
        "• Push to `dev`, check the preview, merge to `main`, then send the invites",
        "",
        `Full checklist: ${CHECKLIST_URL}`
    ].join("\n");
}

async function postReminder(env, isTest = false) {
    if (!env.DISCORD_WEBHOOK_URL) throw new Error("DISCORD_WEBHOOK_URL is not set");
    const year = new Date().getUTCFullYear();
    const res = await fetch(env.DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: reminderMessage(year, isTest), allowed_mentions: { parse: [] } })
    });
    if (!res.ok) throw new Error(`Discord webhook failed: ${res.status}`);
}

export default {
    async scheduled(controller, env, ctx) {
        // `wrangler dev --test-scheduled` triggers this with cron "* * * * *"
        ctx.waitUntil(postReminder(env, controller.cron !== "0 16 2 9 *"));
    }
};
