<div align="center">

<img src="public/readme/banner.svg" alt="Ambox — AI-Powered Collaboration for Video Creators & Editors" width="100%" />

<br/>

<h3>The command center for video creators and editors — briefs, revisions and approvals in one place.</h3>

[![Live Demo](https://img.shields.io/badge/Live%20Demo-ambox--t6yf.vercel.app-6d28d9?style=for-the-badge&logo=vercel&logoColor=white)](https://ambox-t6yf.vercel.app/)
&nbsp;
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
&nbsp;
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%7C%20Auth%20%7C%20Realtime-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
&nbsp;
[![Gemini](https://img.shields.io/badge/Google%20Gemini-2.0%20Flash-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)

<p>
  <img src="https://img.shields.io/github/last-commit/Mudavath-Giri-Naik/ambox?style=flat-square&color=6d28d9" alt="last commit" />
  <img src="https://img.shields.io/github/languages/top/Mudavath-Giri-Naik/ambox?style=flat-square&color=db2777" alt="top language" />
  <img src="https://img.shields.io/badge/status-active%20development-brightgreen?style=flat-square" alt="status" />
  <img src="https://img.shields.io/badge/PRs-welcome-blueviolet?style=flat-square" alt="PRs welcome" />
</p>

[Live Demo](https://ambox-t6yf.vercel.app/) · [Report a Bug](https://github.com/Mudavath-Giri-Naik/ambox/issues) · [Request a Feature](https://github.com/Mudavath-Giri-Naik/ambox/issues)

</div>

<br/>

## Table of Contents

- [Why Ambox](#why-ambox)
- [Features](#features)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [AI Voice Brief Pipeline](#ai-voice-brief-pipeline)
- [Data Model](#data-model)
- [Project Lifecycle](#project-lifecycle)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

<br/>

## Why Ambox

> Video production breaks down at the handoff between the person with the vision and the person with the timeline.

**The problem.** Creators and editors coordinate through a patchwork of tools that were never built for the job — Google Drive links for raw footage, WhatsApp voice notes for direction, email threads for approvals, and no single source of truth for *what version is the latest one*. Instructions get lost, feedback arrives out of context, and every revision round costs another day of back-and-forth.

| Without Ambox | With Ambox |
|---|---|
| Direction scattered across chats, notes, and calls | One AI-structured **Voice Brief** with timestamped instructions |
| "Which file is the final cut?" | Versioned uploads with a clear status per project |
| Feedback buried in message history | Timestamped comments pinned directly to the video |
| No visibility into where a project stands | A shared status pipeline both sides can see in real time |

**The solution.** Ambox is a single workspace that connects creators and editors around one project record. A creator records a spoken brief; Ambox transcribes it and extracts structured, timestamped editing instructions with AI. The editor works against organized raw materials and clear requirements, uploads versions for review, and the creator approves, requests changes, or rates the work — all inside one real-time thread.

<br/>

## Features

| | Feature | Description |
|---|---|---|
| 🎙️ | **AI Voice Briefs** | Creators record spoken instructions; Gemini transcribes the audio and extracts structured, timestamped, prioritized editing tasks — no manual note-taking. |
| 👥 | **Dual-Role Workspaces** | Purpose-built dashboards and flows for **Creators** and **Editors**, with role-aware navigation, stats, and actions. |
| 🔄 | **Project Lifecycle Tracking** | Every project moves through a clear status pipeline — briefing, assignment, editing, review, changes requested, approved, completed. |
| 🎞️ | **Version Control for Video** | Editors upload raw footage and successive edited cuts; creators can compare versions and always know which one is current. |
| 💬 | **Timestamped Video Comments** | Feedback is pinned to an exact point on the timeline instead of a vague written description. |
| ⚡ | **Real-Time Chat** | Project-level messaging with typing indicators and unread badges, powered by Supabase Realtime. |
| 🔔 | **Notifications & Activity Feed** | Live updates on assignments, status changes, and new messages so nothing falls through the cracks. |
| ⭐ | **Ratings & Reviews** | Creators rate editors on completion, building a track record that carries across future projects. |
| 🔐 | **Secure by Default** | Supabase Auth + middleware-enforced route protection keep creator and editor data isolated. |

<br/>

## How It Works

```mermaid
flowchart LR
    A(["🎨 Creator<br/>records Voice Brief"]) --> B["🤖 AI transcribes &<br/>extracts instructions"]
    B --> C(["📁 Project created<br/>with raw materials"])
    C --> D(["🖊️ Editor assigned<br/>reviews brief & footage"])
    D --> E(["⬆️ Editor uploads<br/>edited version"])
    E --> F(["👀 Creator reviews<br/>with timestamped comments"])
    F -- "Changes requested" --> D
    F -- "Approved" --> G(["✅ Completed<br/>+ Editor rated"])
```

<br/>

## Architecture

```mermaid
flowchart TB
    subgraph Client["Browser"]
        UI["Next.js App Router UI<br/>(React 19 + Tailwind + shadcn/ui)"]
    end

    subgraph Edge["Next.js Server"]
        MW["Middleware<br/>(Supabase session guard)"]
        API["/api/transcribe-brief<br/>Route Handler"]
    end

    subgraph Supabase["Supabase Platform"]
        AUTH["Auth"]
        DB[("Postgres<br/>profiles · projects · versions · comments · messages")]
        STORAGE["Storage<br/>(audio, video, avatars)"]
        RT["Realtime<br/>(postgres_changes)"]
    end

    GEMINI["Google Gemini 2.0 Flash<br/>(speech → structured JSON)"]

    UI -- "session cookies" --> MW
    MW --> UI
    UI -- "auth, CRUD, uploads" --> AUTH
    UI -- "video / audio files" --> STORAGE
    UI -- "subscribe to changes" --> RT
    RT -. "live updates" .-> UI
    UI -- "record voice brief" --> API
    API -- "fetch audio" --> STORAGE
    API -- "transcribe + parse" --> GEMINI
    GEMINI -- "structured instructions" --> API
    API -- "persist transcript & tasks" --> DB
    DB --- AUTH
    DB --- RT

    Vercel["▲ Vercel"] -.deploys.-> Edge
```

<br/>

## AI Voice Brief Pipeline

The core differentiator of Ambox: a creator's spoken direction becomes structured, actionable, timestamped tasks in one round trip.

```mermaid
sequenceDiagram
    participant C as Creator (Browser)
    participant S as Supabase Storage
    participant R as Next.js API Route
    participant G as Gemini 2.0 Flash
    participant DB as Supabase Postgres

    C->>S: Upload recorded audio (project-briefs bucket)
    S-->>C: Public audio URL
    C->>R: POST /api/transcribe-brief { project_id, audio_url }
    R->>S: Fetch audio buffer
    R->>G: generateContent(prompt + inline audio)
    G-->>R: JSON — transcript, language,<br/>summary, timestamped instructions, notes
    R->>DB: UPDATE projects<br/>(voice_transcript, parsed_instructions, brief_language)
    DB-->>R: OK
    R-->>C: { success, transcript, parsedInstructions }
    Note over C,DB: Realtime subscription pushes<br/>the structured brief to the assigned editor
```

<br/>

## Data Model

```mermaid
erDiagram
    PROFILES ||--o{ PROJECTS : "creates (creator_id)"
    PROFILES ||--o{ PROJECTS : "is assigned (editor_id)"
    PROJECTS ||--o{ PROJECT_VERSIONS : "has versions"
    PROJECT_VERSIONS ||--o{ VIDEO_COMMENTS : "has timestamped comments"
    PROFILES ||--o{ VIDEO_COMMENTS : "authors"
    PROJECTS ||--o{ MESSAGES : "has chat thread"
    PROFILES ||--o{ MESSAGES : "sends"

    PROFILES {
        uuid id PK
        text name
        text email
        text role "creator | editor"
        text avatar_url
    }
    PROJECTS {
        uuid id PK
        uuid creator_id FK
        uuid editor_id FK
        text title
        text platform
        text status
        text priority
        text voice_brief_url
        text voice_transcript
        jsonb parsed_instructions
        int  unread_creator_count
        int  unread_editor_count
        int  creator_rating
        timestamp deadline
        timestamp last_activity_at
    }
    PROJECT_VERSIONS {
        uuid id PK
        uuid project_id FK
        uuid uploaded_by FK
        int  version_number
        text type "raw | edited"
        text file_url
        text comment
    }
    VIDEO_COMMENTS {
        uuid id PK
        uuid version_id FK
        uuid user_id FK
        int  timestamp_seconds
        text content
        bool is_resolved
    }
    MESSAGES {
        uuid id PK
        uuid project_id FK
        uuid sender_id FK
        text content
        timestamp created_at
    }
```

<br/>

## Project Lifecycle

Every project moves through a well-defined status machine, driving what each role can see and do:

```mermaid
stateDiagram-v2
    [*] --> briefing : Creator drafts project + voice brief
    briefing --> pending_acceptance : Editor assigned
    pending_acceptance --> briefing : Editor declines
    pending_acceptance --> in_edit : Editor accepts
    in_edit --> review : Edited version uploaded
    review --> changes_requested : Creator requests changes
    review --> approved : Creator approves
    changes_requested --> in_edit : Editor re-uploads
    approved --> completed : Editor marks complete
    completed --> [*] : Creator rates editor
```

<br/>

## Tech Stack

<table>
<tr><td valign="top"><b>Framework</b></td><td>

![Next.js](https://img.shields.io/badge/Next.js%2016-App%20Router-000000?style=flat-square&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19.2-149ECA?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)

</td></tr>
<tr><td valign="top"><b>UI &amp; Styling</b></td><td>

![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-Radix%20Primitives-000000?style=flat-square)
![Lucide](https://img.shields.io/badge/Lucide-Icons-F56565?style=flat-square)

</td></tr>
<tr><td valign="top"><b>Backend &amp; Data</b></td><td>

![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Supabase Auth](https://img.shields.io/badge/Supabase-Auth-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Supabase Storage](https://img.shields.io/badge/Supabase-Storage-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Supabase Realtime](https://img.shields.io/badge/Supabase-Realtime-3ECF8E?style=flat-square&logo=supabase&logoColor=white)

</td></tr>
<tr><td valign="top"><b>AI</b></td><td>

![Google Gemini](https://img.shields.io/badge/Google%20Gemini-2.0%20Flash-8E75B2?style=flat-square&logo=googlegemini&logoColor=white)

</td></tr>
<tr><td valign="top"><b>Tooling &amp; Deployment</b></td><td>

![ESLint](https://img.shields.io/badge/ESLint-9-4B32C3?style=flat-square&logo=eslint&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Deployment-000000?style=flat-square&logo=vercel&logoColor=white)

</td></tr>
</table>

<br/>

## Project Structure

```text
ambox/
├── app/
│   ├── api/
│   │   └── transcribe-brief/     # Gemini voice-brief transcription endpoint
│   ├── auth/callback/            # Supabase OAuth/session callback
│   ├── components/               # App-level components (chat, modals, cards, feed)
│   ├── creator/dashboard/        # Creator workspace
│   ├── editor/dashboard/         # Editor workspace
│   ├── explore/                  # Discover creators / editors
│   ├── project/[id]/             # Project detail — brief, versions, chat, review
│   ├── login/ · onboarding/      # Auth & role onboarding
│   ├── notifications/ · search/ · settings/
│   └── layout.tsx · page.tsx     # Root layout & landing page
├── components/ui/                # shadcn/ui primitives (button, dialog, sidebar, ...)
├── hooks/                        # Shared React hooks
├── lib/
│   ├── supabase/helpers.js       # Typed data-access layer (projects, versions, comments, chat)
│   └── supabaseClient.js         # Browser Supabase client
├── middleware.js                 # Route-level auth guard
└── public/                       # Static assets
```

<br/>

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com/) project (Auth, Postgres, Storage enabled)
- A [Google AI Studio](https://aistudio.google.com/) API key for Gemini

### Installation

```bash
git clone https://github.com/Mudavath-Giri-Naik/ambox.git
cd ambox
npm install
```

### Configure environment

Create a `.env.local` file in the project root — see [Environment Variables](#environment-variables) below.

### Set up Supabase

Follow [`SUPABASE_SETUP_CHECKLIST.md`](SUPABASE_SETUP_CHECKLIST.md) to provision the database schema, storage buckets, and Row Level Security policies. [`SUPABASE_DEPLOYMENT_GUIDE.md`](SUPABASE_DEPLOYMENT_GUIDE.md) covers the optional Edge Function alternative to the built-in API route.

### Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

<br/>

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous/public key (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key used by the transcription API route to write results server-side |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key powering voice-brief transcription & parsing |

> Never commit `.env.local` — it's already covered by `.gitignore`.

<br/>

## Roadmap

- [ ] Email digest notifications for offline creators/editors
- [ ] Multi-editor collaboration on a single project
- [ ] In-app payments / escrow for project milestones
- [ ] Analytics dashboard (turnaround time, revision counts, ratings trends)
- [ ] Mobile-optimized recording & review experience
- [ ] Public editor portfolios

See [open issues](https://github.com/Mudavath-Giri-Naik/ambox/issues) for the full list of proposed features and known issues.

<br/>

## Contributing

Contributions make the open-source community a great place to learn and build. Any contributions are **greatly appreciated**.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

<br/>

## License

No open-source license has been declared for this project yet — all rights are reserved by the author unless a `LICENSE` file is added. Open an issue if you'd like to discuss licensing terms.

<br/>

<div align="center">

Built for the creator economy — one clear brief at a time.

[⬆ Back to top](#table-of-contents)

</div>
