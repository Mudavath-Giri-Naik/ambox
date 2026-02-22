# Ambox

## Problem
In the modern creator economy, video creators and editors face significant friction in their collaboration workflow. Content creators often struggle to clearly communicate their vision, leading to endless back-and-forth emails, scattered feedback across multiple messaging apps, and missed deadlines. Editors, on the other hand, frequently receive unclear instructions, struggle to organize fragmented raw materials, and lack a streamlined way to present their work for review. 

## Solution
Ambox is a comprehensive SaaS platform built to seamlessly connect video creators with video editors. It centralizes the entire video production workflow into a single, cohesive environment. Creators can upload raw footage, assign tasks, and importantly, provide **AI-transcribed Voice Briefs** that automatically extract editing instructions and timestamps. Editors can view their assigned projects, access organized raw materials, review clear requirements, and upload edited versions for feedback and approval. 

## Features
- **Dual User Roles**: Targeted dashboards and flows for Creators and Editors.
- **AI-Powered Voice Briefs**: Creators can record spoken instructions. Ambox transcribes the audio and structures the instructions into actionable, timestamped tasks.
- **Project Workflows & Statuses**: Track projects from "Pending Acceptance" to "In Progress", "In Review", and "Completed".
- **Video Version Control**: Editors can upload multiple versions of a video. Creators can review, request changes, or approve the final cut.
- **Real-Time Chat**: Integrated project-level chat with typing indicators and unread message notifications using Supabase Realtime.
- **Professional Video Layouts**: Consistent 16:9 YouTube-style video playback for both raw materials and edited versions.
- **Notifications & Activity Feed**: Real-time project updates, notifications for status changes, and personalized unread message indicators.
- **Rating System**: Creators can rate and review editors upon project completion.

## Technical Approach
Ambox is built using a modern, scalable tech stack:
- **Framework & Routing**: Next.js (App Router) for server-side rendering and optimized performance.
- **Styling & UI**: Tailwind CSS for styling, combined with **shadcn/ui** and **Lucide React** icons to achieve a professional, accessible, and clean SaaS aesthetic.
- **Backend & Database**: **Supabase** handles authentication, PostgreSQL database, storage (for videos, avatars, and audio), and real-time subscriptions.
- **AI Integration**: AI APIs are used for converting voice briefs to text, which is then parsed into structured JSON instructions.
- **Deployment**: Configured to run seamlessly on Vercel or any Node.js environment.

## Impact
By replacing fragmented communication tools (like Google Drive + WhatsApp + Email) with a purpose-built platform, Ambox drastically reduces the time spent on coordination. Clear AI-parsed voice briefs decrease revision rounds by ensuring editors understand the exact requirements the first time. The result is a faster, more organized, and stress-free video production pipeline for both creators and editors.

## How to Run

### Prerequisites
- Node.js (v18 or higher)
- npm, yarn, pnpm, or bun
- A Supabase Project (with Auth, Storage, and Database configured)
- Deepgram / OpenAI API Keys (for Voice Brief AI transcription and parsing)

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/ambox.git
cd ambox
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env.local` file in the root directory and add the following keys:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DEEPGRAM_API_KEY=your_deepgram_key
OPENAI_API_KEY=your_openai_key
```

### 4. Run the development server
```bash
npm run dev
```

### 5. Open the app
Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## Conclusion
Ambox defines the future of creator-editor collaboration. By bringing project management, file sharing, AI-assisted communication, and real-time feedback into one centralized SaaS platform, it empowers creative teams to focus on what they do best: creating amazing content.
