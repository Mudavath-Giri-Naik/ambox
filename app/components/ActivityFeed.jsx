"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getStatusLabel } from "./StatusBadge";
import { FolderOpen, UserPlus, Upload, RefreshCw, MessageSquare, Star, ClipboardList } from "lucide-react";

const ACTION_ICONS = {
    project_created: <FolderOpen className="h-5 w-5 text-blue-500" />,
    editor_assigned: <UserPlus className="h-5 w-5 text-indigo-500" />,
    version_uploaded: <Upload className="h-5 w-5 text-green-500" />,
    status_changed: <RefreshCw className="h-5 w-5 text-orange-500" />,
    message_sent: <MessageSquare className="h-5 w-5 text-purple-500" />,
    project_rated: <Star className="h-5 w-5 text-yellow-500" />,
};

function timeAgo(dateString) {
    if (!dateString) return "";
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "yesterday";
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
}

function formatActivity(activity, currentUserId) {
    const { action, details, project, user } = activity;
    const projectTitle = project?.title || "a project";
    const userName = user?.id === currentUserId ? "You" : (user?.name || "Someone");
    const isYou = user?.id === currentUserId;

    switch (action) {
        case "project_created":
            return isYou ? `You created ${projectTitle}` : `${userName} created ${projectTitle}`;
        case "editor_assigned":
            return isYou
                ? `You were assigned to ${projectTitle}`
                : `${userName} was assigned to ${projectTitle}`;
        case "version_uploaded": {
            const ver = details?.version_number ? ` v${details.version_number}` : "";
            return isYou
                ? `You uploaded${ver} for ${projectTitle}`
                : `${userName} uploaded${ver} for ${projectTitle}`;
        }
        case "status_changed": {
            const newStatus = details?.new_status ? getStatusLabel(details.new_status) : "updated";
            return `${projectTitle} status changed to ${newStatus}`;
        }
        case "message_sent":
            return `New message in ${projectTitle}`;
        case "project_rated": {
            const rating = details?.rating ? `${details.rating} stars` : "";
            return isYou
                ? `You rated ${projectTitle} ${rating}`
                : `${userName} rated ${projectTitle} ${rating}`;
        }
        default:
            return `Activity in ${projectTitle}`;
    }
}

export default function ActivityFeed({ role, userId }) {
    const router = useRouter();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(false);

    useEffect(() => {
        if (!userId) return;

        const fetchActivities = async () => {
            // First get project IDs for this user
            const projectFilter = role === "creator"
                ? { column: "creator_id", value: userId }
                : { column: "editor_id", value: userId };

            const { data: userProjects } = await supabase
                .from("projects")
                .select("id")
                .eq(projectFilter.column, projectFilter.value);

            if (!userProjects || userProjects.length === 0) {
                setActivities([]);
                setLoading(false);
                return;
            }

            const projectIds = userProjects.map((p) => p.id);

            const { data, error } = await supabase
                .from("activity_log")
                .select(`
                    *,
                    project:projects!project_id(id, title),
                    user:profiles!user_id(id, name, avatar_url)
                `)
                .in("project_id", projectIds)
                .order("created_at", { ascending: false })
                .limit(11);

            if (error) {
                console.error("[ActivityFeed] Error:", error.message);
                setActivities([]);
            } else {
                setHasMore((data || []).length > 10);
                setActivities((data || []).slice(0, 10));
            }
            setLoading(false);
        };

        fetchActivities();
    }, [userId, role]);

    if (loading) {
        return (
            <Card>
                <CardHeader><CardTitle className="text-lg">Recent Activity</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">Loading...</p></CardContent>
            </Card>
        );
    }

    if (activities.length === 0) {
        return (
            <Card>
                <CardHeader><CardTitle className="text-lg">Recent Activity</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0 px-0">
                {activities.map((activity, i) => (
                    <div key={activity.id || i}>
                        {i > 0 && <Separator />}
                        <div
                            className="flex items-start gap-3 px-6 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => activity.project?.id && router.push(`/project/${activity.project.id}`)}
                        >
                            {ACTION_ICONS[activity.action] || <ClipboardList className="h-5 w-5 text-muted-foreground" />}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm leading-snug">
                                    {formatActivity(activity, userId)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {timeAgo(activity.created_at)}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
                {hasMore && (
                    <>
                        <Separator />
                        <div className="px-6 py-3 text-center">
                            <button className="text-sm text-primary hover:text-primary/80 underline underline-offset-2">
                                View all activity
                            </button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
