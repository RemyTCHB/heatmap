# TCHB Deal Heat Map

A live map of TCHB's signed, closed and cancelled deals across the USA, with leaderboards, built in the Universal Team
Hub's look. Deals come from GoHighLevel webhooks and are matched by **contact ID**.

The Heat Map is a separate app: its own Vercel project and its own Firebase project. It does not read or write the
Hub's data.

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
| Cancel feedback | `FEEDBACK (MUST FILL)` |
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

## Tests

`npm test`
