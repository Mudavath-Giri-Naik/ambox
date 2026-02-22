<<<<<<< HEAD
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```
Hiii

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
=======
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
>>>>>>> ff4af3ff0ce6edbc2bb60355d565d9ffe584ad79
