"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentUser, getUserProfile } from "@/lib/supabase/helpers";
import AuthGuard from "../components/AuthGuard";
import DashboardShell from "../components/DashboardShell";
import StatusBadge, { PlatformBadge } from "../components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Inbox, MessageSquare } from "lucide-react";

function timeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

function NotificationsContent() {
    const router = useRouter();
    const [profile, setProfile] = useState(null);
    const [userId, setUserId] = useState(null);
    const [projectThreads, setProjectThreads] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const user = await getCurrentUser();
            if (!user) return;
            setUserId(user.id);
            const { profile: p } = await getUserProfile(user.id);
            setProfile(p);

            // Fetch all projects user is involved in
            const { data: projects } = await supabase
                .from("projects")
                .select(`
                    id, title, platform, status,
                    creator_id, editor_id,
                    unread_creator_messages, unread_editor_messages,
                    last_activity_at,
                    creator:profiles!creator_id(id, name, avatar_url),
                    editor:profiles!editor_id(id, name, avatar_url)
                `)
                .or(`creator_id.eq.${user.id},editor_id.eq.${user.id}`)
                .order("last_activity_at", { ascending: false });

            if (!projects || projects.length === 0) {
                setProjectThreads([]);
                setLoading(false);
                return;
            }

            // Fetch latest message per project
            const projectIds = projects.map((p) => p.id);
            const { data: messages } = await supabase
                .from("messages")
                .select(`
                    id, project_id, content, created_at,
                    sender:profiles!sender_id(id, name, avatar_url)
                `)
                .in("project_id", projectIds)
                .order("created_at", { ascending: false });

            // Group: latest message per project
            const latestMessageMap = {};
            (messages || []).forEach((m) => {
                if (!latestMessageMap[m.project_id]) {
                    latestMessageMap[m.project_id] = m;
                }
            });

            // Build threads
            const isCreator = p?.role === "creator";
            const threads = projects.map((proj) => {
                const unread = isCreator
                    ? proj.unread_creator_messages || 0
                    : proj.unread_editor_messages || 0;
                const lastMsg = latestMessageMap[proj.id] || null;
                return { ...proj, unread, lastMsg };
            });

            // Sort: unread first, then by last activity
            threads.sort((a, b) => {
                if (a.unread > 0 && b.unread === 0) return -1;
                if (a.unread === 0 && b.unread > 0) return 1;
                return new Date(b.last_activity_at) - new Date(a.last_activity_at);
            });

            setProjectThreads(threads);

            // Reset unread counts for projects with unread messages
            const unreadProjects = threads.filter((t) => t.unread > 0);
            if (unreadProjects.length > 0) {
                const field = isCreator ? "unread_creator_messages" : "unread_editor_messages";
                for (const proj of unreadProjects) {
                    await supabase
                        .from("projects")
                        .update({ [field]: 0 })
                        .eq("id", proj.id);
                }
            }

            setLoading(false);
        };
        load();
    }, []);

    const totalUnread = projectThreads.reduce((sum, t) => sum + t.unread, 0);

    return (
        <DashboardShell>
            <div className="p-3 sm:p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Bell className="h-6 w-6 text-foreground" /> Notifications
                        {totalUnread > 0 && (
                            <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-xs">{totalUnread}</Badge>
                        )}
                    </h1>
                    <p className="text-muted-foreground text-sm">Messages and updates from your projects.</p>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-muted-foreground">Loading...</div>
                ) : projectThreads.length === 0 ? (
                    <Card>
                        <CardContent className="py-16 text-center">
                            <div className="flex justify-center mb-3"><Inbox className="h-10 w-10 text-muted-foreground/40" /></div>
                            <p className="text-muted-foreground">No messages yet. Start a conversation in a project!</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {projectThreads.map((thread) => (
                            <Card
                                key={thread.id}
                                className={`cursor-pointer transition-colors hover:bg-muted/50 ${thread.unread > 0 ? "border-primary/30 bg-primary/5" : ""}`}
                                onClick={() => router.push(`/project/${thread.id}`)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-4">
                                        {/* Sender avatar */}
                                        <Avatar className="h-10 w-10 shrink-0 mt-0.5">
                                            {thread.lastMsg?.sender ? (
                                                <>
                                                    <AvatarImage src={thread.lastMsg.sender.avatar_url} />
                                                    <AvatarFallback>{thread.lastMsg.sender.name?.[0]}</AvatarFallback>
                                                </>
                                            ) : (
                                                <AvatarFallback><MessageSquare className="h-5 w-5 text-muted-foreground" /></AvatarFallback>
                                            )}
                                        </Avatar>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className={`text-sm truncate ${thread.unread > 0 ? "font-bold" : "font-medium"}`}>
                                                    {thread.title}
                                                </span>
                                                <PlatformBadge platform={thread.platform} />
                                                <StatusBadge status={thread.status} />
                                            </div>

                                            {thread.lastMsg ? (
                                                <p className={`text-sm truncate ${thread.unread > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                                                    <span className="font-medium">{thread.lastMsg.sender?.name}:</span>{" "}
                                                    {thread.lastMsg.content}
                                                </p>
                                            ) : (
                                                <p className="text-sm text-muted-foreground italic">No messages yet</p>
                                            )}
                                        </div>

                                        {/* Right side: time + unread badge */}
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <span className="text-[10px] text-muted-foreground">
                                                {timeAgo(thread.lastMsg?.created_at || thread.last_activity_at)}
                                            </span>
                                            {thread.unread > 0 && (
                                                <Badge variant="destructive" className="rounded-full px-1.5 py-0.5 text-[10px]">
                                                    {thread.unread}
                                                </Badge>
                                            )}
                                        </div>
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

export default function NotificationsPage() {
    return <AuthGuard><NotificationsContent /></AuthGuard>;
}
