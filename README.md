# Deals Heat Map

A live map of TCHB's signed, closed and cancelled deals across the USA, with leaderboards, built in the Universal Team
Hub's look. Deals come from GoHighLevel webhooks and are matched by **contact ID**.

The Heat Map is a separate app: its own Vercel project and its own Firebase project. It does not read or write the
Hub's data.

## The Page

`index.html` at the root is the Heat Map: the map (pins, heat, states), the leaderboards, the deal list, the deal panel
and Settings, in the Hub's look. People sign in with their company Google account.

- **Everyone at totalchb.com and kpidriver.com** can view it.
- **Only Remy, Monz and Jan** can edit, add and delete deals, fix review flags, and change the Settings lists.
  Everyone else sees it read-only, and the server enforces the same rule.
- **The team is mirrored from the Hub** (read only, refreshed once a day or with Refresh From Hub in Team Members): the ACQ, DISPO and FUS lists start
  with each department's members, and names on deals that are not in the Hub show as Not In Hub.
- **Active** shows who has the page open, like the Hub (each device checks in every minute).
- **The clock** is the live status: green when everything is saved and synced, blue while saving, red when something
  did not save. Click it for the last sync time and Retry Now.
- **Pins sit at the exact street address** (US Census geocoder), or at the ZIP when the address is not found.
- **Where To Market** suggests where to market more and where to pull back (close rate and profit against the team),
  and groups cancel reasons into themes with fixes.
- The page refreshes the deals every minute, so new hooks show up without reloading.

The page says **Contracts** and **Revenue**; the data underneath (the hook keys such as `AB Profit (TC)`, the stored fields and the API names) keeps its original `deal` and `profit` names, so receiving is unchanged.

Its endpoints (`api/app/[op].js`): `GET /api/app/config`, `GET /api/app/data`, `POST /api/app/presence`,
`POST /api/app/deal`, `POST /api/app/options`, `POST /api/app/geocode` (moves pins from the ZIP to the exact address, a
batch per call, owner only), and `POST /api/app/import` (the one-time CSV history load, webhook key only).

A hook for a deal that came from the CSV history (no contact ID yet) finds it by house number and ZIP and adopts it,
so a deal signed before go-live closes on its own row.

## Webhooks

GoHighLevel sends the same payload to each address. The address says which event happened.

| Event | Address |
| --- | --- |
| Contract Signed | `POST https://<your-domain>/api/hooks/signed?key=<HEATMAP_WEBHOOK_KEY>` |
| Closed Deal | `POST https://<your-domain>/api/hooks/closed?key=<HEATMAP_WEBHOOK_KEY>` |
| Cancelled Deal | `POST https://<your-domain>/api/hooks/cancelled?key=<HEATMAP_WEBHOOK_KEY>` |

Each hook updates the deal for its **contact ID** in the Firestore collection `heatmap_deals`, and a short log entry
with only the mapped fields goes to `heatmap_hooks`. The rest of the payload (call transcripts, phone numbers,
recording links) is not stored.

### Rules

- **The date of each event is when its hook arrives.** A Signed hook today is signed today; a Closed hook tomorrow is
  closed tomorrow.
- **Signed** starts a deal for the contact. A repeat Signed while the deal is open only refreshes its details; a
  Signed after a cancel or a close starts a new deal.
- **Closed** closes the deal; its profit is `AB Profit (TC)`. A closed deal with no DISPO gets `TCHB` and a flag.
- **A second Closed** on a contact whose deal already closed is the **Fix & Flip resale**; its profit is `BC Profit`,
  and the deal's actual profit is both closings added up.
- **Cancelled** cancels the open deal and keeps the Feedback. A Cancelled after a close is kept in history and flagged.
- Hooks that arrive without a Signed one first still make a deal, flagged to check.

### Field mapping (confirmed by the owner)

| Heat Map field | Hook key |
| --- | --- |
| Contact ID | `contact_id` |
| Street, city, state, ZIP | `address1`, `city`, `state`, `postal_code` |
| Lead source | `Lead Source` |
| Date lead came in | `Date Created` |
| ACQ / FUS / DISPO | `ACQ Manager` / `FUS Manager` / `Dispo Manager` |
| Potential profit | `Potential Profit` |
| Exit strategy | `Final Exit Strategy` |
| Feedback (on a cancelled contract it says why it fell through; the page shows only this field) | `FEEDBACK (MUST FILL)` |
| Profit at the closing | `AB Profit (TC)` |
| Profit at the Fix & Flip resale | `BC Profit` |
| Kept for reference | `AB Date Signed`, `AB Actual Closing Date`, `BC Date Signed`, `Actual Sold Date` |

### Reading the data

- `GET https://<your-domain>/api/hooks/deals?key=<HEATMAP_WEBHOOK_KEY>&limit=50`: deals, most recently updated first.
- `GET https://<your-domain>/api/hooks/inbox?key=<HEATMAP_WEBHOOK_KEY>&limit=10`: the hook log, newest first. Add
  `&event=closed` for one event.

The key can also go in an `X-Heatmap-Key` header. It is a secret: anyone with it can read the deals.

## Setup (Vercel)

1. In Firebase, create a new project for the Heat Map, add a Firestore database, and download a service account key
   (Project settings, Service accounts, Generate new private key).
2. In Vercel, add a new project from this repository.
3. In the Vercel project's Environment Variables, add:
   - `HEATMAP_WEBHOOK_KEY`: a long random password you make up. It goes in the three addresses.
   - `HEATMAP_FIREBASE_SERVICE_ACCOUNT`: the whole contents of the service account key file from step 1.
4. Deploy. The three addresses above, with your domain and key, go into the GoHighLevel workflows' Webhook actions.
5. Google sign-in, in the same Firebase project:
   - Authentication, Get started, Sign-in method: enable **Google**.
   - Authentication, Settings, Authorized domains: add your domain (e.g. `heatmap.totalchb.com`).
   - Project settings, General, Your apps: add a **Web** app and copy its `firebaseConfig` object.
   - In Vercel, add `HEATMAP_FIREBASE_WEB_CONFIG` with that object as JSON (keys in double quotes), then redeploy.
6. Optional, in Vercel: `HEATMAP_EDITORS` (emails that can edit besides the owner, comma-separated),
   `HEATMAP_OWNERS`, and `HEATMAP_ALLOWED_DOMAINS`. Defaults are in `api/_lib/auth.js`.
7. The team mirror: `HEAT_MAP_SECRET`, the same value as `HEAT_MAP_SECRET` in the Hub's project (the Hub's team
   endpoint must list it among the secrets it accepts). Read only: the Heat Map never writes to the Hub.

## The Guide

Photo menu → **Help** opens the guide for the person's role: the **Editor Guide** for Remy, Monz and Jan (the editing
tools first, then everything else), and the **Viewer Guide** for everyone else. Editors can switch to the Viewer Guide.

- The text is in `docs/guide/viewer.md` and `docs/guide/editor.md`.
- `node tools/help-shots.js` retakes the screenshots into `help/img/` (needs Playwright with Chromium). It fills the page
  with **made-up sample deals**, never real ones.
- `node tools/help-build.mjs` builds `help/guides.json`, which the page loads.

Edit the Markdown, retake the screenshots if the screens changed, then run the build.

## Tests

`npm test`
