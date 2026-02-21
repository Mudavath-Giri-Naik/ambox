"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">A</div>
            <span className="text-lg font-bold">Ambox</span>
          </div>
          <Button onClick={() => router.push("/login")} size="sm">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center space-y-6">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
            Built for creator–editor workflows
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Collaborate on video
            <br />
            <span className="text-muted-foreground">without the chaos</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Ambox brings creators and editors together. Assign projects, upload versions, review edits, and ship content — all in one place.
          </p>
          <div className="flex gap-3 justify-center">
            <Button size="lg" onClick={() => router.push("/login")}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push("/explore")}>
              Explore
            </Button>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="border-t py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <div className="text-2xl">🎬</div>
            <h3 className="font-semibold">Project Management</h3>
            <p className="text-sm text-muted-foreground">Create projects, assign editors, and track progress with clear status workflows.</p>
          </div>
          <div className="space-y-2">
            <div className="text-2xl">📤</div>
            <h3 className="font-semibold">Version Control</h3>
            <p className="text-sm text-muted-foreground">Upload versions, preview videos inline, and keep a complete revision history.</p>
          </div>
          <div className="space-y-2">
            <div className="text-2xl">✅</div>
            <h3 className="font-semibold">Review & Approve</h3>
            <p className="text-sm text-muted-foreground">Approve edits or request changes with one click. Dashboards stay synced automatically.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 px-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Ambox. Built with Next.js & Supabase.
      </footer>
    </div>
  );
}
