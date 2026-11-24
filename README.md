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

Every hook is saved as it arrived in the Firestore collection `heatmap_hooks` (event, time received, contact ID, the
whole body). For now that is all they do: the field mapping is built from these real payloads, then the hooks start
updating the map.

To see what arrived: `GET https://<your-domain>/api/hooks/inbox?key=<HEATMAP_WEBHOOK_KEY>&limit=10`, newest first.
Add `&event=closed` for one event. The key is a secret: anyone with it can read the saved hooks.

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
