# Minis Coach

A web app (desktop and phone) for running the minis section. It covers:

- **Drill library:** each drill has an animated SVG diagram that steps through how it runs, plus set-up, coaching cues, progressions and regressions, safety notes, and videos (YouTube/Vimeo links or uploads) and photos.
- **Diagram editor:** drag players, defenders, coaches, balls, cones and tags onto a pitch. Add steps, draw run and pass arrows (or generate them from movement) and add "TAG!" / "Try!" callouts. Works with touch.
- **Session plans:** a builder for 45-minute sessions. Drag blocks to reorder them and change their minutes. A colour timeline shows how the time is split. Each block links a drill and has its own coach focus. Plans can be printed or duplicated to another age group.
- **Season calendar:** weeks for each age group with the plan assigned to each, plus festivals, cancellations and notes. **Cancel & shift** moves the remaining plans forward one week so no learning objective is skipped.
- **Players:** a roster with photos. A photo can only be uploaded once photo consent is recorded, and unticking consent deletes the photo. Player records also hold medical notes, emergency contacts, linked parents and an attendance history.
- **Register:** big photo tiles you tap on the pitch-side (present, absent or late, plus "All present"). Coach attendance is recorded on the same screen.
- **Coach availability:** a grid of coaches by week. Weeks with fewer than two coaches available are highlighted.
- **Awards:** player of the week, badges and certificates, with a printable PDF certificate for each one.
- **Family enrolment by QR:** a coach taps **Players → Enrol a family** and shows a one-time QR code (single use, valid for 30 minutes, for the coach's age group). The parent scans it with their phone, creates an account (or signs in to add a sibling), adds their child or children with an optional date of birth, and chooses photo consent. The coach's screen updates as soon as they're enrolled.
- **Parent portal (read-only):** parents see their own child's schedule, attendance and awards, and nothing else. Parents control their child's photo consent and, under **Account**, can unenrol a child (permanently deletes the record, attendance, awards and photo) or delete their own account (children still linked to another parent are kept; the rest are deleted).

The database comes pre-loaded with the **U6 2026-27 plan**: 23 Sunday sessions from 29 Nov 2026 to 2 May 2027, with every block, coach-focus note and checkpoint. It also has all 19 drills from the handbook and the drill cards, and the RFU U7 rules summary.

## Roles

| Role | Can do |
|---|---|
| **Admin** | Everything: invites, roles, coach assignments, seasons, age groups, deleting records |
| **Coach** | Edit drills and plans (shared club library). Players, register, awards and season weeks **only for the age groups they're assigned to** |
| **Parent** | Read-only view of their own linked child |

Permission checks run on the server in every action and data loader (`src/lib/access.ts` and `src/lib/authz.ts`), not just in the UI. Photos, videos and certificates are served only through `/api/media/…` and `/api/certificate/…`, which check permissions on every request. Nothing in the media folder is public.

## Local development

Requirements: Node 22+, pnpm, Docker.

```bash
cp .env.example .env            # then set AUTH_SECRET (openssl rand -base64 48) and the admin password
docker compose up -d db         # Postgres on localhost:5433, data in ./data/postgres
pnpm install
pnpm db:migrate
pnpm db:seed                    # idempotent: never overwrites edits made in the app
pnpm dev                        # http://localhost:3000
```

Sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env`. Then go to **Admin** to:
1. **Invite** coaches and parents. This creates a one-time link you can send by WhatsApp or email; no email server is needed.
2. **Assign coaches** to age groups (tap a cell: – → Assistant → Head).
3. Add players on **Players** (one at a time, or paste a list), then link parents from each player's page.

## Deploying (self-hosted Docker)

On any small Linux server or NAS with Docker:

```bash
git clone … && cd rugby-training-planning
cp .env.example .env
# set: AUTH_SECRET, POSTGRES_PASSWORD, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD,
#      APP_DOMAIN=coach.yourclub.org  (DNS A record pointing at this server)
docker compose up -d --build
```

- **Caddy** gets an HTTPS certificate for `APP_DOMAIN` automatically (ports 80 and 443 must be open).
- The app runs migrations and the idempotent seed on every start.
- **Data lives in local folders**: `./data/postgres` (database) and `./data/media` (photos, videos).
- **Backups:** the `backup` service writes a nightly `pg_dump` and a tarball of the media to `./backups` and keeps 30 days. Copy `./backups` somewhere off the server (for example rclone to cloud storage).
- To restore: `gunzip -c backups/crc-YYYY-MM-DD.sql.gz | docker compose exec -T db psql -U crc crc` and `tar -xzf backups/media-YYYY-MM-DD.tar.gz -C data/media`.

### Testing the QR on a real phone (development)
`localhost` isn't reachable from a phone. Open the app on your computer at its network address instead (e.g. `http://192.168.x.x:3000`, which `pnpm dev` prints as "Network"), or set `APP_URL` in `.env`. The QR code then points at that address. In production, `APP_URL` is set from `APP_DOMAIN` in `docker-compose.yml`.

## Publishing the image (GitHub Container Registry)

Build once on your computer for both amd64 and arm64 (Raspberry Pi), push it to `ghcr.io`, and let servers pull it instead of building:

```bash
# one-time: a GitHub token (classic) with the write:packages scope
echo "$GHCR_TOKEN" | docker login ghcr.io -u <github-username> --password-stdin

pnpm image:push            # → ghcr.io/tomroffe/mini-coaching:<git-sha> and :latest
pnpm image:push v1.0.0     # → :v1.0.0 and :latest
PLATFORMS=linux/arm64 pnpm image:push   # Pi only, quicker
```

On the server (e.g. the Pi):

```bash
docker compose pull app && docker compose up -d
```

If the package is **private** (the default for a new GHCR package), the server needs a `docker login ghcr.io` too, with a token that has only `read:packages`. Or make the package public under GitHub → your profile → Packages → mini-coaching → Package settings. The image holds no secrets: those all come from `.env` at run time. To run a specific version, set `APP_IMAGE=ghcr.io/tomroffe/mini-coaching:v1.0.0` in `.env`.



```bash
pnpm test        # unit tests: permissions, cancel-and-shift, seeded diagram + season data
pnpm test:e2e    # Playwright, desktop + iPhone: uses a throwaway crc_test database on :3101
```

The end-to-end suite covers: creating and animating a drill, adding a video, building a plan and assigning it to a week, cancel & shift, register, coach availability, awards and the PDF certificate, photo consent (blocked without it, deleted when withdrawn), and parent/coach data isolation.

## Project layout

```
src/
  app/(app)/          signed-in pages: dashboard, season, sessions, drills, players, register, coaches, awards, parent, admin
  app/api/            media (auth-checked file streaming) and certificate PDFs
  components/diagram/ DiagramSvg (renderer), DrillDiagram (player), DiagramEditor
  db/schema.ts        Drizzle schema; migrations in ./drizzle (pnpm db:generate after schema changes)
  db/seed/            U6 2026-27 season, drills and their diagrams (diagram-builder.ts DSL)
  lib/access.ts       pure permission rules (unit-tested)
  lib/diagram.ts      diagram JSON model + zod validation
  lib/season.ts       cancel-and-shift + week generation (unit-tested)
docker/               Caddyfile, entrypoint, backup script
```

## Safeguarding notes

- Follow the RFU safeguarding and photography guidance: record photo consent from a parent or guardian before uploading any photo.
- Medical notes and emergency contacts are visible only to admins, coaches of that age group, and the child's linked parents.
- Deactivate coaches who leave (Admin → People). Their sign-in stops working immediately.
- The RFU U7 rules summary is a coaching aid. The official RFU Regulation 15 remains authoritative and should be re-checked each season.
