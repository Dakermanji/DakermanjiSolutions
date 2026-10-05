# Dakermanji Solutions

A multilingual portfolio and server-rendered web application with user accounts, social connections, real-time chat, private notes, room collaboration, notifications, and weather tools.

**Live website:** [dakermanji.com](https://dakermanji.com/)

## Features

- **Public website:** portfolio, services, contact form, and legal pages.
- **Localization:** Arabic, English, and French, including right-to-left layouts.
- **Preferences:** system, light, and dark themes; preferred language.
- **Accounts:** email signup and verification, bcrypt passwords, password recovery, Google/GitHub/Discord sign-in, and OAuth account linking.
- **Profile:** username, country, DiceBear avatars, login methods, and email-confirmed account deletion.
- **Social:** follow requests, followers, followees, blocking, and live updates.
- **Chat:** direct conversations, private self-notes, rooms, join requests, invitations, message reactions, mentions, message flags, and room activity logs.
- **Presence:** Available, Away, Busy, and Offline indicators in the navbar, social lists, Chat Friends, friend conversations, and room member lists.
- **Notifications:** an application inbox, unread badges, previews, and real-time updates.
- **Weather:** city search, five-day forecasts, metric/imperial units, localized locations, and optional Unsplash backgrounds.

Available is automatic while connected and active. Inactivity changes it to Away after five minutes; users can also choose Away or Busy manually. Offline is automatic when disconnected and cannot be selected. Manual choices survive reconnects and server restarts. Open social, Chat Friends, and room member lists receive live status changes through Socket.IO, as does the open friend conversation header.

## Technology

Node.js 20+, Express 5, EJS, Bootstrap, PostgreSQL, Passport, Socket.IO, and i18next. Sessions are stored in PostgreSQL through `connect-pg-simple`. Nodemailer sends transactional email. Helmet, CSRF protection, and rate limiting protect application requests; Winston, Morgan, optional Sentry, and opt-in request timing provide diagnostics.

## Local setup

### 1. Install dependencies

```bash
npm install
```

The postinstall script applies the checked-in dependency patches using `patch-package`; keep the `patches/` directory when deploying.

### 2. Configure the environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

PowerShell equivalent:

```powershell
Copy-Item .env.example .env
```

Edit the example values before starting. Configuration is defined in `config/dotenv.js` and loaded through `utils/config/dotenv.js`. Existing process environment variables take precedence over `.env`. `.env.production` is not automatically selected by the current loader.

| Group | Variables | Notes |
| --- | --- | --- |
| Application | `NODE_ENV`, `PORT`, `CLIENT_URL` | Local defaults are development, port 3000, and `http://localhost:3000`. |
| Sessions | `SESSION_SECRET` | Required; use a long random secret. |
| PostgreSQL | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Password is required. Use the actual database host and credentials. |
| Database TLS | `DB_SSL`, `DB_SSL_CA_PATH` | Set `DB_SSL=false` for a local database without TLS. For TLS, use `true`; provide a CA path only when needed. Certificate verification remains enabled. |
| Email | `EMAIL_ADMIN`, `EMAIL_PASSWORD`, `EMAIL_SERVICE`, `EMAIL_HOST`, `EMAIL_PORT` | The first five are required by configuration. The SMTP transport uses host, port, and credentials; port 465 enables implicit TLS. |
| OAuth | `GOOGLE_*`, `GITHUB_*`, `DISCORD_*` | Each provider requires `CLIENT_ID`, `CLIENT_SECRET`, and `CALLBACK_URL`. |
| Weather | `OPENWEATHER_API_KEY` | Required to retrieve forecasts. City search uses Open-Meteo geocoding. |
| Backgrounds | `UNSPLASH_ACCESS_KEY` | Optional; enables weather photo backgrounds. |
| Monitoring | `SENTRY_DSN` | Optional; leave empty when unused. |
| Diagnostics | `REQUEST_TIMING` | Defaults to `false`; enable temporarily with exactly `true`. |

The `{CLIENT_URL}` text in `.env.example` is a placeholder, not automatic variable expansion. Replace each callback with a complete URL:

```env
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
DISCORD_CALLBACK_URL=http://localhost:3000/auth/discord/callback
```

Replace the example SMTP port with a numeric port, and clear the example Sentry DSN if unused. Do not commit real credentials or `.env` files.

### 3. Initialize PostgreSQL

Create the database and an application database user. For a **fresh database**, execute all numbered scripts in `sql/` in ascending order, from `01_session.sql` through `30_kanban_project_invitations.sql`:

```bash
for file in sql/[0-9][0-9]_*.sql; do
  psql -h localhost -U YOUR_DB_USER -d YOUR_DB_NAME -v ON_ERROR_STOP=1 -f "$file" || break
done
```

Use your database connection details. These commands do not read the application's `.env` automatically. A database administration UI can also execute the files in order.

Numbered scripts cover sessions, accounts and security, social relationships, API usage logs, chat, rooms, notifications, reactions, mentions, and Kanban tables. The session table must exist before startup. This repository has no migration runner; review schema changes and back up an existing database before applying SQL updates. Certificate files in `sql/` are not SQL scripts. For an existing database, apply any missing numbered scripts in order before using Kanban invitations.

After the numbered scripts, run `sql/z_alter.sql` for both fresh and existing databases before starting this version. It adds `users.presence_status`, defaulting existing and new accounts to Available (`online`). Only manual choices are saved; automatic Away and Offline never overwrite the saved preference.

### 4. Run the application

```bash
npm run dev
```

Open `http://localhost:3000`. To run without watch mode:

```bash
npm start
```

Both commands preload `instrument.js` for Sentry initialization. Startup waits for translations and checks PostgreSQL connectivity before listening. The SMTP connection is verified separately and reports failures in the logs.

There is currently no `npm test` script. Run the presence tests with `node --test tests/presence/*.test.js`, and verify affected flows manually after changes, including sign-in, protected pages, and any changed real-time features.

## Production deployment

1. Provision PostgreSQL and apply the required schema scripts.
2. Deploy the application source, assets, translations, dependency patches, and package lockfile. Install dependencies with `npm ci`.
3. Set `NODE_ENV=production`, the public HTTPS `CLIENT_URL`, session secret, database settings, email credentials, and provider credentials in the hosting environment.
4. Register the production callback URLs with the corresponding OAuth providers:

   | Provider | Callback |
   | --- | --- |
   | Google | `https://dakermanji.com/auth/google/callback` |
   | GitHub | `https://dakermanji.com/auth/github/callback` |
   | Discord | `https://dakermanji.com/auth/discord/callback` |

   The configured callback must match what the app sends. If using `www`, configure that hostname consistently. Keep development and production provider configuration separate where necessary.
5. Start the application with `npm start`, or configure the hosting Node.js loader to use `server.js`. A loader that starts `server.js` directly must also preload `instrument.js` if Sentry instrumentation is wanted.
6. Verify HTTPS, sign-in, email delivery, protected pages, and Socket.IO connections. Restart the running app after code or environment changes.

The Express app trusts one proxy hop, and production session cookies require HTTPS. Ensure the hosting proxy arrangement matches that configuration. Socket.IO uses the same HTTP server and PostgreSQL-backed session middleware; verify the host supports its polling and WebSocket traffic. Multi-process real-time deployment requires additional coordination beyond the current in-process Socket.IO setup.

For cPanel/CloudLinux hosting, use the application's **Setup Node.js App** environment settings and its displayed virtual-environment activation command before running Node commands in the terminal. Paths and Node versions depend on the hosting account. Saving a local file does not deploy it.

## Performance diagnostics

Public files are served before sessions and user/navigation queries, while retaining security headers and request logging.

To diagnose slow dynamic requests, set this in the running application's environment and restart:

```env
REQUEST_TIMING=true
```

Open the affected page, then inspect the application-root log:

```bash
tail -n 30 request-timing.log
```

An `enabled` entry confirms initialization. Completed requests record `parsingMs`, `sessionMs`, `passportMs`, `viewSetupMs`, `navbarMs`, `routeAndResponseMs`, and `totalMs`, plus timestamp, HTTP method, and status. URLs, cookies, and user data are excluded. The final stage includes downstream route handling and response completion, not just controller execution.

These measurements start after static-file middleware; they do not include time spent waiting in the hosting proxy before Express receives the request, and they do not instrument Socket.IO traffic. Compare them with the matching browser request's Network timing. A quick standalone `SELECT 1` does not establish that all application queries or the live connection pool are fast.

Set `REQUEST_TIMING=false` and restart after diagnosis. The diagnostic file is ignored by Git and has no automatic rotation. Console log locations depend on the hosting provider; stdout is not necessarily captured in `stderr.log`.

## Project layout

| Directory | Purpose |
| --- | --- |
| `config/` | Application bootstrap configuration, database, Passport, Socket.IO, localization, and logging |
| `constants/` | Shared application constants |
| `controllers/` | HTTP request and response handling |
| `routes/` | Feature route registration |
| `services/` | Business logic, external APIs, and live event handling |
| `models/` | PostgreSQL access |
| `middlewares/` | Sessions, authorization, CSRF, validation, navigation data, and diagnostics |
| `views/` | EJS pages, layouts, and partials |
| `public/` | Browser assets and `robots.txt` |
| `locales/` | Arabic, English, and French translation namespaces |
| `sql/` | Ordered database schema scripts |
| `patches/` | Dependency patches applied during installation |

`.structure.json` is the maintained file map; register new source files there.

## Authentication and crawling notes

Email verification, password reset, and account deletion store hashed tokens in the database. Shared OAuth account handling lives in `services/auth/oauth.js`, with provider setup in `config/passport/strategies/`. Protected application pages require authentication, and users with incomplete signup are routed through account completion.

`public/robots.txt` is served at `/robots.txt`. It leaves public pages and their rendering assets crawlable and asks crawlers to skip authentication, private application routes, and Socket.IO. It is not access control or a guarantee that a URL will never appear in search results. No sitemap is currently provided.

## Author and license

Developed by Behnam Dakermanji. Licensed under the MIT license; see `LICENSE`.
