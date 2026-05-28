# VedaAI · AI Assessment Creator

A full-stack AI-powered assessment creator. A teacher fills out a form, optionally uploads a PDF of reference material, and the system generates a beautifully formatted, exam-ready question paper with sections, difficulty tags, and PDF export — all driven by a real-time WebSocket pipeline.

This repository is a monorepo with two apps:

| Folder       | Stack                                                              |
| ------------ | ------------------------------------------------------------------ |
| `frontend/`  | Next.js 14 (App Router) · TypeScript · Zustand · Tailwind · shadcn-style components |
| `backend/`   | Node.js · Express · TypeScript · MongoDB · Redis · BullMQ · Socket.io · OpenAI |

---

## 1 · Quick start

```bash
# 1. Start MongoDB + Redis
docker compose up -d

# 2. Backend (two processes — API + worker)
cd backend
cp .env.example .env       # OPENAI_API_KEY is optional (mock generator works without it)
npm install
npm run dev                # starts the Express + Socket.io API on :4000
npm run dev:worker         # in a second terminal, starts the BullMQ worker

# 3. Frontend
cd ../frontend
cp .env.example .env.local
npm install
npm run dev                # opens on :3000
```

Open <http://localhost:3000>, click **Create assignment**, fill in the form, submit. You'll be redirected to the assignment page where the WebSocket pipeline streams progress in real time. When the worker finishes, the question paper renders inline with one-click PDF export.

> **Without OpenAI** the system falls back to a deterministic mock generator that produces a realistic structured paper, so you can demo the full flow with zero external dependencies.

---

## 2 · Architecture

```
                        ┌────────────────────────────────────────────────────────┐
                        │                  Browser (Next.js)                     │
                        │   • Zustand store  • Socket.io client  • PDF export    │
                        └──────────────┬───────────────────────┬─────────────────┘
                                       │ HTTP (REST + multipart)│ WebSocket
                                       ▼                       ▼
                        ┌────────────────────────────────────────────────────────┐
                        │                Express API (TypeScript)                │
                        │   POST /api/assignments       (multer + Zod validate)  │
                        │   GET  /api/assignments[/:id] (Redis read-through)     │
                        │   POST /api/assignments/:id/regenerate                 │
                        │   /socket.io           (rooms: `assignment:<id>`)      │
                        └─────────────┬───────────────┬──────────────────────────┘
                                      │ Mongoose      │ BullMQ enqueue
                                      ▼               ▼
                              ┌─────────────┐   ┌─────────────┐
                              │   MongoDB   │   │    Redis    │◄─ pub/sub bridge ─┐
                              │ assignments │   │ • cache     │                    │
                              └─────────────┘   │ • BullMQ Q  │                    │
                                                │ • LLM cache │                    │
                                                └──────┬──────┘                    │
                                                       │ poll                       │
                                                       ▼                            │
                        ┌────────────────────────────────────────────────────────┐ │
                        │                Worker process (BullMQ)                  │ │
                        │   1. Load assignment from Mongo                         │ │
                        │   2. Build prompt (system + user, w/ extracted PDF)     │ │
                        │   3. Call OpenAI (or mock)                              │ │
                        │   4. Validate output with Zod, repair if needed         │ │
                        │   5. Save to Mongo, publish progress events ────────────┘
                        └────────────────────────────────────────────────────────┘
```

### How real-time updates work

The worker can't talk to Socket.io clients directly (it's a separate process), so we use Redis Pub/Sub as a one-way fan-out:

1. Worker calls `publishAssignmentEvent(...)` → `redis.publish("vedaai:assignment-events", ...)`
2. The API process runs a `socketBridge` subscriber that picks up every event and emits it to the right Socket.io room.
3. The frontend joins the room with `socket.emit("subscribe:assignment", id)` and receives updates as the job progresses.

The dashboard *also* receives a broadcast (`assignment:list-update`) so the card list reflects status changes without polling.

### LLM output handling — _no raw rendering_

The worker never trusts the LLM blindly:

1. Prompt is built from a strict system + user template that requires JSON-only output and includes the exact TypeScript type the model must conform to.
2. Response goes through `JSON.parse`.
3. Output is validated with a strict Zod schema (`GeneratedPaperSchema`).
4. If validation fails, a single repair pass coerces required fields and re-validates.
5. Only the validated paper object is stored in MongoDB and rendered in the UI.

The frontend renders the parsed structure with semantic React components (`<SectionBlock>`, `<QuestionBlock>`, `<DifficultyBadge>`), never `dangerouslySetInnerHTML`.

### Caching strategy

| Layer            | Key pattern                       | TTL  | Purpose                         |
| ---------------- | --------------------------------- | ---- | ------------------------------- |
| Assignment GET   | `vedaai:assignment:<id>`          | 5 m  | Avoid repeated DB reads         |
| LLM output       | `vedaai:gen:<sha256(prompt)>`     | 24 h | Reuse identical generations     |
| BullMQ job state | (managed by BullMQ on Redis)      | —    | Queue, retries, dedupe          |

Regeneration explicitly bypasses the LLM cache (`bypassCache: true`).

---

## 3 · Project layout

```
VedaAI/
├── docker-compose.yml         # Mongo + Redis
├── backend/
│   ├── src/
│   │   ├── config/            # env, db, redis
│   │   ├── models/            # Mongoose schemas
│   │   ├── queue/             # BullMQ queue definition
│   │   ├── realtime/          # Socket.io server + Redis pub/sub bridge
│   │   ├── routes/            # /api/assignments
│   │   ├── services/          # promptBuilder, aiClient, mockGenerator, fileExtractor
│   │   ├── types.ts           # shared Zod schemas
│   │   ├── index.ts           # API entrypoint
│   │   └── worker.ts          # BullMQ worker entrypoint
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── app/               # App Router pages
    │   │   ├── page.tsx                    # Dashboard (empty + filled state)
    │   │   ├── assignments/new/page.tsx    # Creation form
    │   │   └── assignments/[id]/page.tsx   # Output / generating screen
    │   ├── components/
    │   │   ├── layout/        # AppShell (topbar + sidebar + mobile nav)
    │   │   ├── ui/            # Button, Card, Badge, FileDrop, NumberStepper, ...
    │   │   ├── dashboard/     # AssignmentCard
    │   │   ├── create/        # CreateAssignmentForm
    │   │   └── output/        # ActionBar, PaperView, GeneratingState
    │   ├── lib/               # api, socket, types, utils, pdfExport
    │   └── store/             # Zustand store w/ socket binding
    ├── package.json
    └── tailwind.config.ts
```

---

## 4 · API reference

| Method | Path                                  | Body / params                     | Response                          |
| ------ | ------------------------------------- | --------------------------------- | --------------------------------- |
| POST   | `/api/assignments`                    | `multipart/form-data` (see below) | `Assignment` with `status=queued` |
| GET    | `/api/assignments`                    | —                                 | `Assignment[]` (newest first)     |
| GET    | `/api/assignments/:id`                | —                                 | `Assignment`                      |
| POST   | `/api/assignments/:id/regenerate`     | —                                 | `Assignment` re-queued            |
| DELETE | `/api/assignments/:id`                | —                                 | `204`                             |
| WS     | `/socket.io`                          | events below                      | —                                 |

### `POST /api/assignments` body

| field                    | type                                | required |
| ------------------------ | ----------------------------------- | -------- |
| `title`                  | string                              | yes      |
| `subject`                | string                              | yes      |
| `classGrade`             | string                              | no       |
| `dueDate`                | ISO date string                     | yes      |
| `duration`               | string (e.g. "90 minutes")          | no       |
| `questionTypes`          | JSON array of `{type,count,marks}`  | yes      |
| `difficultyMix`          | JSON `{easy,moderate,hard}` ⇒ 100   | yes      |
| `additionalInstructions` | string                              | no       |
| `material`               | file (PDF / text, ≤ 10 MB)          | no       |

### Socket.io events

| Event (server → client)        | Payload                                                  |
| ------------------------------ | -------------------------------------------------------- |
| `assignment:update`            | `{ assignmentId, status, progress, stage, result?, error? }` (room-scoped) |
| `assignment:list-update`       | same shape, broadcast to all clients (drives dashboard)  |

| Event (client → server)        | Payload          | Effect                          |
| ------------------------------ | ---------------- | ------------------------------- |
| `subscribe:assignment`         | `assignmentId`   | join `assignment:<id>` room     |
| `unsubscribe:assignment`       | `assignmentId`   | leave room                      |

---

## 5 · Approach & design decisions

### Why this stack

* **BullMQ** — production-grade job queue that handles retries, dedupe (via `jobId = assignment._id`), exponential backoff, and progress reporting. AI calls can be slow or fail, so they belong in a worker, not the request thread.
* **Redis pub/sub bridge** — separates the worker from Socket.io. The worker has zero coupling to HTTP server state, which makes horizontal scaling trivial (multiple workers, multiple API replicas).
* **Zod everywhere** — same schemas validate the form on both ends. The LLM response is also validated through Zod, so we never render raw model output.
* **Mock generator fallback** — the entire system is demoable without an OpenAI key. The mock isn't a "lorem ipsum" stub — it produces topically-relevant questions with proper sections, difficulty distribution, and marks.
* **Zustand** — the spec asked for Redux *or* Zustand. Zustand is leaner, plays nicely with Next.js client components, and lets the WebSocket bind to the store once globally.

### Validation rules enforced (no empty / negative values)

* Title 2–200 chars, subject required.
* Due date can't be in the past.
* At least one question type must be selected.
* Question count: 1–50 per type. Marks: 0.5–50 per question.
* Difficulty mix must sum to exactly 100.
* Uploaded file: ≤ 10 MB, PDF / text only.

The form uses `react-hook-form` + Zod resolver; the same Zod schema is enforced server-side too.

### Output page

Designed as a real exam paper, not "AI output dressed up":

* Serif headline (Source Serif 4) + sans-serif body (Inter) for an exam-paper feel.
* Filled student-info row at the top (Name / Roll / Section).
* Sections grouped by question type (Section A, B, …) with their own instruction line.
* Continuous question numbering across sections.
* Difficulty badges colour-coded (emerald / amber / rose) — not just text.
* Inline answer hints rendered per question type (4 options for MCQ, dotted lines for short/long answers, "True / False" placeholders, etc.).
* Sticky action bar with **Regenerate**, **Print**, **Download PDF**, **Delete**.
* Print stylesheet ensures `Save as PDF` from the browser produces clean A4 output without UI chrome.

### Mobile

The layout is fully responsive: a bottom-nav appears on `< lg`, the form sidebar collapses below the form, the action bar's labels collapse to icons, and the question paper reflows to single-column.

---

## 6 · Bonus features

* **PDF export** — uses the native print pipeline with a custom `@media print` stylesheet so the result has perfect typography (no garbled raster). The action bar's **Print** button gives the same dialog without renaming the document.
* **Regenerate** — re-queues the same assignment with `bypassCache: true`, gives a new job ID, and streams progress live again.
* **Difficulty badges** — colour-coded with a small leading dot, matching the on-screen colour key in the form.
* **Read-through cache** — `GET /api/assignments/:id` is cached in Redis for 5 minutes (only when `status=completed`). Sets an `X-Cache: HIT|MISS` header.
* **LLM response cache** — identical prompts skip the LLM entirely (24h TTL), saving cost during demo / iteration.

---

## 7 · Production notes

* `OPENAI_API_KEY` is optional. The system uses `gpt-4o-mini` by default — override with `OPENAI_MODEL`.
* Both processes (API and worker) read the same `.env` and connect to the same Mongo + Redis. Workers can be scaled out independently — `GENERATION_CONCURRENCY` defaults to 2.
* The API container would normally be put behind a reverse proxy (nginx / Caddy) and the WebSocket upgraded on the same port.
* Uploaded files are stored in `backend/uploads/` for the dev setup. In production you'd swap `multer.diskStorage` for an S3 / Cloud Storage adapter — the rest of the pipeline doesn't care.

---

## 8 · Scripts cheat sheet

### Backend (`/backend`)

| Command            | Description                              |
| ------------------ | ---------------------------------------- |
| `npm run dev`      | Express + Socket.io API (`tsx watch`)    |
| `npm run dev:worker` | BullMQ worker process                  |
| `npm run typecheck` | `tsc --noEmit`                          |
| `npm run build`    | Compile to `dist/`                       |
| `npm run start`    | Run compiled API                         |
| `npm run start:worker` | Run compiled worker                  |

### Frontend (`/frontend`)

| Command             | Description                |
| ------------------- | -------------------------- |
| `npm run dev`       | Next.js dev server (:3000) |
| `npm run typecheck` | `tsc --noEmit`             |
| `npm run build`     | Production build           |
| `npm run start`     | Production server          |
| `npm run lint`      | `next lint`                |

---

## 9 · A note on the Figma source

The Figma file referenced in the assignment brief sits in the VedaAI team's Figma plan. My account isn't a member of that plan, so the Figma MCP returned _"file could not be accessed"_ for every node ID. Rather than block the build, I implemented the screens the brief describes (empty state dashboard, filled dashboard, upload + selector form, generating state, structured output page, mobile dashboard variants) using the same modern SaaS design patterns the brief implies — clean hierarchy, exam-paper layout for the output, colour-coded difficulty tags, sticky action bar, and a mobile-first responsive layout. If you grant my Figma account (`work.milancodes@gmail.com`) view access, I'm happy to do a second pass to align pixel-for-pixel.

---

## 10 · License

MIT — built for the VedaAI hiring assignment.
