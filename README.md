# Scott Pilgrim & Sandwich Day

Event site for scottpilgrimday.com, hosted on **Cloudflare Pages**. The whole site sits
behind a shared password; the address is a Cloudflare secret and is only sent to guests
who have logged in.

> This repo is **public**. Never commit the password, the address, or any `.dev.vars` / `.secrets` file.

## How it fits together

| Piece | What it does |
|---|---|
| `event.conf` | Public yearly settings: event date, last year's date, thank-you switch, Turnstile site key |
| `build.sh` | Cloudflare build command. Copies the site into `dist/`, writes `dist/config.js`, patches the title/link-preview date |
| `functions/_middleware.js` | Password gate in front of every request. Login form posts to `/api/login`, sets a cookie that remembers the browser for a year |
| `functions/api/event-details.js` | Returns address/venue from secrets to logged-in guests |
| `login.html` | The page everyone sees first; also what link previews (Discord, iMessage) show |
| `index.html`, `js/script.js` | The event page. Address shows "TBD" until `EVENT_ADDRESS` is set |
| `thank-you.html` | Shown instead of the home page when `SHOW_THANK_YOU_PAGE=true` |

Branches: work on `dev` (each push auto-bumps the patch version and gets a Cloudflare preview
deploy), merge to `main` to go live (each push tags a GitHub release).

## Yearly checklist

1. `event.conf`: set `EVENT_DATE`, `EVENT_END` and `MOVIE_START` (Pacific time, `-08:00` in November),
   move the old date to `HISTORIC_DATE`, set `SHOW_THANK_YOU_PAGE=false`.
2. `index.html`: update the food, venue blurb, and any one-off notices.
3. Cloudflare → Workers & Pages → `sandwichday` → Settings → Variables and Secrets:
   rotate `SITE_PASSWORD` (this also logs out last year's browsers); set `EVENT_ADDRESS` once known. `EVENT_LAT` / `EVENT_LNG` are optional: without them the map is placed from the address.
   Variable changes only apply to **new** deployments, so redeploy afterwards.
4. Push to `dev`, check the preview, merge to `main`.
5. Invite image: `npm run dev`, log in, open `/invite.html` and screenshot the 1200x630 card
   (date/times fill in from `event.conf`; update the Discord link in it if it changed).
   Save it as `assets/images/invite.jpg`: it is also the link-preview image, and the only
   picture that loads without the password.
6. After the party: `SHOW_THANK_YOU_PAGE=true`, and update the text in `thank-you.html`
   (it still thanks people for the 2025 party at Claro's).

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars   # local-only secrets; uses Cloudflare's always-pass Turnstile test keys
npm run dev                      # builds, then serves on http://localhost:8788
```

Log in with whatever `SITE_PASSWORD` you put in `.dev.vars`.

## Cloudflare setup (one time)

1. **Turnstile** (dashboard → Turnstile → Add widget; done 2026-10, widget "scottpilgrimday.com login"): hostnames `scottpilgrimday.com`,
   `sandwichday.pages.dev` (subdomains are covered automatically). Put the **site key** in `event.conf`
   (`TURNSTILE_SITE_KEY`); keep the **secret key** for step 3.
2. **Pages project** (Workers & Pages → Create → Pages → Connect to Git → `mscrnt/sandwichday`):
   production branch `main`, build command `sh build.sh`, output directory `dist`.
3. **Secrets** (Settings → Variables and Secrets, add to both **Production** and **Preview**, type *Secret*):
   `SITE_PASSWORD`, `TURNSTILE_SECRET_KEY`, and later `EVENT_ADDRESS`, `EVENT_LAT`, `EVENT_LNG`
   (optional: `EVENT_VENUE_NAME`, `EVENT_VENUE_DETAILS` override the "Mission Viejo, CA / At a friend's place" text).
4. **Custom domains** (project → Custom domains): add `scottpilgrimday.com` and `www.scottpilgrimday.com`.
   Delete the old DNS records first (apex `A 162.255.119.150`, `www CNAME mscrnt.com`) if Cloudflare complains.
