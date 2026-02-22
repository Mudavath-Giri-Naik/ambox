"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentUser, getUserProfile } from "@/lib/supabase/helpers";
import AuthGuard from "../components/AuthGuard";
import DashboardShell from "../components/DashboardShell";
import StatusBadge, { PlatformBadge, PriorityBadge, DeadlineText } from "../components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search } from "lucide-react";

function SearchContent() {
    const router = useRouter();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState("");
    const [filterPlatform, setFilterPlatform] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterPriority, setFilterPriority] = useState("");

    useEffect(() => {
        const load = async () => {
            const user = await getCurrentUser();
            if (!user) return;
            const { profile } = await getUserProfile(user.id);

            // Fetch all projects user is involved in
            const { data } = await supabase
                .from("projects")
                .select(`
                    id, title, platform, status, priority, deadline,
                    creator_id, editor_id, last_activity_at, description,
                    creator:profiles!creator_id(id, name, avatar_url),
                    editor:profiles!editor_id(id, name, avatar_url)
                `)
                .or(`creator_id.eq.${user.id},editor_id.eq.${user.id}`)
                .order("last_activity_at", { ascending: false });

            setProjects(data || []);
            setLoading(false);
        };
        load();
    }, []);

    // Extract distinct filter values
    const platforms = [...new Set(projects.map((p) => p.platform).filter(Boolean))];
    const statuses = [...new Set(projects.map((p) => p.status).filter(Boolean))];
    const priorities = ["low", "normal", "high", "urgent"];

    // Apply filters
    const filtered = projects.filter((p) => {
        if (searchText && !p.title.toLowerCase().includes(searchText.toLowerCase())) return false;
        if (filterPlatform && p.platform !== filterPlatform) return false;
        if (filterStatus && p.status !== filterStatus) return false;
        if (filterPriority && p.priority !== filterPriority) return false;
        return true;
    });

    const hasActiveFilters = searchText || filterPlatform || filterStatus || filterPriority;

    return (
        <DashboardShell>
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Search className="h-6 w-6 text-foreground" /> Search Projects</h1>
                    <p className="text-muted-foreground text-sm">Search and filter across all your projects.</p>
                </div>

                {/* Search + Filters */}
                <Card>
                    <CardContent className="p-4 space-y-3">
                        <Input
                            placeholder="Search by project title..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="w-full"
                        />
                        <div className="flex flex-wrap gap-2">
                            {/* Platform filter */}
                            <select
                                value={filterPlatform}
                                onChange={(e) => setFilterPlatform(e.target.value)}
                                className="border border-input rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="">All Platforms</option>
                                {platforms.map((p) => (
                                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                                ))}
                            </select>

                            {/* Status filter */}
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="border border-input rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="">All Statuses</option>
                                {statuses.map((s) => (
                                    <option key={s} value={s}>{s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                                ))}
                            </select>

                            {/* Priority filter */}
                            <select
                                value={filterPriority}
                                onChange={(e) => setFilterPriority(e.target.value)}
                                className="border border-input rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="">All Priorities</option>
                                {priorities.map((p) => (
                                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                                ))}
                            </select>

                            {hasActiveFilters && (
                                <Button variant="ghost" size="sm" onClick={() => { setSearchText(""); setFilterPlatform(""); setFilterStatus(""); setFilterPriority(""); }}>
                                    Clear filters
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {filtered.length} project{filtered.length !== 1 ? "s" : ""} found
                        </p>
                    </CardContent>
                </Card>

                {/* Results */}
                {loading ? (
                    <div className="text-center py-12 text-muted-foreground">Loading...</div>
                ) : filtered.length === 0 ? (
                    <Card>
                        <CardContent className="py-16 text-center">
                            <div className="flex justify-center mb-3"><Search className="h-10 w-10 text-muted-foreground/40" /></div>
                            <p className="text-muted-foreground">
                                {hasActiveFilters ? "No projects match your filters." : "No projects found."}
                            </p>
                            {hasActiveFilters && (
                                <Button variant="link" className="mt-2" onClick={() => { setSearchText(""); setFilterPlatform(""); setFilterStatus(""); setFilterPriority(""); }}>
                                    Clear all filters
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {filtered.map((project) => (
                            <Card
                                key={project.id}
                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => router.push(`/project/${project.id}`)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-medium truncate">{project.title}</span>
                                                    <PlatformBadge platform={project.platform} />
                                                    <StatusBadge status={project.status} />
                                                    {project.priority && <PriorityBadge priority={project.priority} />}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                    {project.creator && (
                                                        <span className="flex items-center gap-1">
                                                            Creator: <span className="font-medium">{project.creator.name}</span>
                                                        </span>
                                                    )}
                                                    {project.editor && (
                                                        <span className="flex items-center gap-1">
                                                            Editor: <span className="font-medium">{project.editor.name}</span>
                                                        </span>
                                                    )}
                                                    {project.deadline && <DeadlineText deadline={project.deadline} />}
                                                </div>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" className="shrink-0 ml-4 h-7 text-xs">View</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </DashboardShell>
    );
}

export default function SearchPage() {
    return <AuthGuard><SearchContent /></AuthGuard>;
}
