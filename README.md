<p align="center">
  <img width="200" height="200" src="https://i.imgur.com/DovNhG7.png">
</p>

<h1 align="center">NE:ONE Play</h1>
<p align="center">A visual canvas for exploring and editing <a href="https://www.iata.org/en/programs/cargo/e/one-record/">IATA ONE Record</a> logistics objects.</p>

<p align="center"><a href="https://github.com/Cargolink-Systems/onerecorddemo/actions/workflows/ci.yml"><img src="https://github.com/Cargolink-Systems/onerecorddemo/actions/workflows/ci.yml/badge.svg" alt="CI"></a></p>

<p align="center"><b><a href="https://onerecorddemo.cargolink.aero">Try the live demo</a></b> — in-browser demo mode, no server or account needed.</p>

Maintained by [Cargolink](https://cargolink.aero). Point it at any ONE Record server and it renders logistics objects — waybills, shipments, pieces, movements — as connected cards on an infinite canvas: click a card's link badge to pull in what it references, expand a card to read or edit its properties, open its event panel to see its status history. Issues and PRs welcome.

## Origins

This project started as [NE:ONE Play](https://devpost.com/software/ne-one-play), a hackathon build at the [ONE Record Hackathon](https://onerecord-fra.devpost.com) by Man Bao Tran Nguyen (design), Niclas Scheiber (test data), and Erik Goldenstein (implementation) — see the [original repository](https://github.com/erikgoldenstein/neoneplay) and [submission video](http://www.youtube.com/watch?v=WwSXzxIoqN8) for that history. This fork carries forward the NE:ONE server compatibility fixes from a later community fork, and Cargolink maintains it going forward with automatic server configuration, an in-browser demo mode, tests, and CI.

## Getting started

Requires Node 20+.

```bash
git clone https://github.com/Cargolink-Systems/onerecorddemo.git
cd onerecorddemo
npm install
npm run dev
```

Open `http://localhost:3000`.

## Using it

1. **Point it at a server.** Click the gear icon (top right) → *ONE Record Servers* → fill in a name, protocol, host, and a bearer token, then submit. No server yet? See [in-browser demo mode](#in-browser-demo-mode) below to try it with zero setup.
2. **Load an object.** Paste a logistics object's URL into the search bar, click **Add**, then click anywhere on the canvas to place it. Typing anything that isn't a URL instead searches the objects already placed on the active tab — by type or by any property value that has loaded — and highlights and jumps to matches. ONE Record has no server-side text search, so this only finds what's already on your canvas; use step 3 to pull more objects in.
3. **Explore.** Click a card's link badge (the small `N 🔗` chip) to pull its referenced objects onto the canvas as connected cards. Click a card's chevron to expand its properties; edit a value and save to send a ONE Record change request.
4. **Check status.** Open a card's event panel to read its logistics events, or post a new one.

Repeat steps 1–2 for as many servers and objects as you want on the same canvas — it can hold multiple servers and objects at once, which is the point of a *ONE Record* view.

### Multiple canvases

The tab bar under the header holds several independent canvases at once — useful for keeping different examples side by side. Click **+** to add a tab, double-click a tab's name to rename it, and click its **×** to close it (the last tab can't be closed). All tabs share the same configured servers; only the placed nodes and edges differ per tab. Tab content persists in the browser across reloads, same as the server list.

### Preconfigured server (optional)

Instead of adding a server by hand, the app can register one automatically and keep its token fresh via the OAuth2 client credentials flow. Set these environment variables (all three of the first group are required to activate; without them, nothing changes):

| Variable | Description |
|-|-|
| `NEONE_PLAY_TOKEN_URL` | OAuth2 token endpoint, e.g. `http://keycloak:8989/realms/neone/protocol/openid-connect/token` |
| `NEONE_PLAY_CLIENT_ID` | Client id for the client credentials grant |
| `NEONE_PLAY_CLIENT_SECRET` | Client secret |
| `NEONE_PLAY_SERVER_HOST` | ONE Record server host, default `localhost:8080` |
| `NEONE_PLAY_SERVER_NAME` | Display name, default `NE:ONE` |
| `NEONE_PLAY_SERVER_PROTOCOL` | `http` or `https`, default `http` |
| `NEONE_PLAY_SERVER_COLOR` | Card color, default `#8b5cf6` |

Put them in `.env.local` for local development (Next.js loads it automatically) or in your deployment's environment. The token request runs server-side (`/api/token`), so the client secret never reaches the browser and the identity provider needs no CORS setup — it is refreshed automatically before it expires.

### In-browser demo mode

Set `NEXT_PUBLIC_DEMO_MODE=1` to run the app with no backend at all: a virtual server ("Demo — in-browser") is registered automatically and a small ONE Record dataset — a waybill with its shipment, pieces, flight, ULD and status events — is served from `localStorage`. The seeded waybill is placed on the canvas on load; expand its links from there. Changes, new events, and new objects are applied instantly and persist in the browser. To start over, use the "Reset demo data" button next to the demo server in the *ONE Record Servers* dialog.

Because this flag is inlined into the client bundle at build time, it must be set before `npm run build` (or `npm run dev`), not as a runtime variable on an already-built server:

```bash
NEXT_PUBLIC_DEMO_MODE=1 npm run dev
```

## Tests

```bash
npm test
```

## Deploying

The root `Dockerfile` builds a standalone production image:

```bash
docker build --build-arg NEXT_PUBLIC_DEMO_MODE=1 -t onerecorddemo .
docker run -p 3000:3000 onerecorddemo
```

`cloudbuild.yaml` builds and deploys the same image to Google Cloud Run:

```bash
gcloud builds submit --config cloudbuild.yaml
```

Every push to `main` triggers this automatically (Cloud Build trigger `deploy-onerecorddemo`, project `air-connect-479417`, region `us-east1`), redeploying the `onerecorddemo` Cloud Run service linked above.

One-time prerequisites on a fresh GCP project, or the command above fails:
- The Artifact Registry repository named by the `_REPO` substitution must exist: `gcloud artifacts repositories create cloud-run-source-deploy --repository-format=docker --location=<region>` (or run `gcloud run deploy --source .` once, which creates it).
- The Cloud Build service account needs the Cloud Run Admin and Service Account User roles.

To preconfigure a server on the deployed service, set the `NEONE_PLAY_*` variables from above on the Cloud Run service (`gcloud run services update <service> --update-env-vars ...`, or via secrets) — they are read at runtime, unlike `NEXT_PUBLIC_DEMO_MODE`.

## Known issues

- The ONE Record server must have [CORS headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) enabled.
- A card on a server with no bearer token doesn't load automatically on placement — expand it once (click its chevron) to trigger the fetch.
- Some UI updates only take effect after a hot reload during local development (save any file to trigger one).

Found something else? [Open an issue](https://github.com/Cargolink-Systems/onerecorddemo/issues).

