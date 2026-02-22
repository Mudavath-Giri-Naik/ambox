"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    getCurrentUser,
    getUserProfile,
    getEditorProjects,
    uploadVersion,
    getNextVersionNumber,
    acceptAssignment,
    rejectAssignment,
} from "@/lib/supabase/helpers";
import { supabase } from "@/lib/supabaseClient";
import AuthGuard from "../../components/AuthGuard";
import DashboardShell from "../../components/DashboardShell";
import StatusBadge, { PlatformBadge, PriorityBadge, DeadlineText, isOverdue } from "../../components/StatusBadge";
import ActivityFeed from "../../components/ActivityFeed";
import { StarDisplay, EditorRatingStats } from "../../components/ProjectRating";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertCircle, ClipboardList, MessageSquare, Check } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

function timeAgo(dateString) {
    if (!dateString) return "—";
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
}

function EditorDashboardContent() {
    const router = useRouter();
    const [profile, setProfile] = useState(null);
    const [userId, setUserId] = useState(null);
    const [projects, setProjects] = useState([]);
    const [uploadsMap, setUploadsMap] = useState({});
    const [rawFootageMap, setRawFootageMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [uploadingId, setUploadingId] = useState(null);
    const fileInputRef = useRef(null);
    const uploadProjectRef = useRef(null);

    const loadData = async () => {
        const user = await getCurrentUser();
        if (!user) return;
        setUserId(user.id);
        const { profile: p } = await getUserProfile(user.id);
        setProfile(p);
        const { projects: list } = await getEditorProjects(user.id);
        setProjects(list);

        // Fetch upload counts per project for this editor
        if (list.length > 0) {
            const projectIds = list.map((p) => p.id);
            const { data: versions } = await supabase
                .from("project_versions")
                .select("project_id, type")
                .in("project_id", projectIds);

            const map = {};
            const rawMap = {};
            (versions || []).forEach((v) => {
                if (v.type === "edited" || (!v.type && v.version_number > 0)) {
                    map[v.project_id] = (map[v.project_id] || 0) + 1;
                }
                if (v.type === "raw" || (!v.type && v.version_number === 0)) {
                    rawMap[v.project_id] = (rawMap[v.project_id] || 0) + 1;
                }
            });
            setUploadsMap(map);
            setRawFootageMap(rawMap);
        }

        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const handleUploadClick = (projectId) => {
        uploadProjectRef.current = projectId;
        fileInputRef.current?.click();
    };

    const handleFileSelected = async (e) => {
        const file = e.target.files?.[0];
        const projectId = uploadProjectRef.current;
        if (!file || !projectId) return;
        setUploadingId(projectId);
        const user = await getCurrentUser();
        if (!user) return;
        const nextVersion = await getNextVersionNumber(projectId);
        const result = await uploadVersion(projectId, user.id, file, nextVersion, "edited");
        if (result.error) {
            alert("Upload failed: " + result.error.message);
        }
        await loadData();
        setUploadingId(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const totalAssigned = projects.length;
    const activeProjects = projects.filter((p) => ["in_edit", "assigned", "in_progress", "changes_requested"].includes(p.status)).length;
    const awaitingFeedback = projects.filter((p) => p.status === "review").length;
    const completed = projects.filter((p) => p.status === "completed").length;
    const unreadMessages = projects.reduce((sum, p) => sum + (p.unread_editor_messages || 0), 0);

    return (
        <DashboardShell>
            <input type="file" ref={fileInputRef} onChange={handleFileSelected} className="hidden" accept="video/*" />
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground text-sm">Your assigned projects and tasks.</p>
                    {profile && <div className="mt-1"><EditorRatingStats editorId={profile.id} /></div>}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Assigned</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{totalAssigned}</p></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{activeProjects}</p></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Awaiting Feedback</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{awaitingFeedback}</p></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{completed}</p></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Unread Messages</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{unreadMessages}</p></CardContent></Card>
                </div>

                {!loading && (() => {
                    const actionProjects = projects
                        .filter((p) => ["pending_acceptance", "changes_requested", "assigned", "briefing"].includes(p.status))
                        .sort((a, b) => {
                            const pOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
                            const pa = pOrder[a.priority] ?? 2, pb = pOrder[b.priority] ?? 2;
                            if (pa !== pb) return pa - pb;
                            if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
                            if (a.deadline) return -1;
                            if (b.deadline) return 1;
                            return 0;
                        });
                    if (actionProjects.length === 0) return null;
                    const displayed = actionProjects.slice(0, 3);
                    return (
                        <div className="space-y-3">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-amber-500" /> Needs Your Action
                                <Badge variant="secondary" className="text-xs">{actionProjects.length}</Badge>
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {displayed.map((project) => (
                                    <Card key={project.id} className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                                        <CardContent className="p-4 space-y-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="font-medium truncate">{project.title}</p>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {["high", "urgent"].includes(project.priority) && <PriorityBadge priority={project.priority} />}
                                                    <StatusBadge status={project.status} />
                                                </div>
                                            </div>
                                            {project.creator && (
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-5 w-5">
                                                        <AvatarImage src={project.creator.avatar_url} />
                                                        <AvatarFallback className="text-[10px]">{project.creator.name?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm text-muted-foreground">{project.creator.name}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground">{timeAgo(project.last_activity_at)}</span>
                                                {project.deadline && <DeadlineText deadline={project.deadline} />}
                                            </div>
                                            {project.status === "pending_acceptance" ? (
                                                <div className="flex gap-2">
                                                    <Button size="sm" className="flex-1 h-8 text-xs" onClick={async () => { await acceptAssignment(project.id); await loadData(); }}>Accept</Button>
                                                    <Button size="sm" variant="destructive" className="flex-1 h-8 text-xs" onClick={async () => { await rejectAssignment(project.id); await loadData(); }}>Reject</Button>
                                                </div>
                                            ) : project.status === "changes_requested" ? (
                                                <Button size="sm" className="w-full h-8 text-xs" onClick={() => handleUploadClick(project.id)} disabled={uploadingId === project.id}>
                                                    {uploadingId === project.id ? "Uploading..." : "Upload Version"}
                                                </Button>
                                            ) : (
                                                <Button size="sm" className="w-full h-8 text-xs" onClick={() => router.push(`/project/${project.id}`)}>Start Working</Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                            {actionProjects.length > 3 && (
                                <p className="text-sm text-muted-foreground">
                                    and <button className="text-primary underline underline-offset-2 hover:text-primary/80" onClick={() => { }}>{actionProjects.length - 3} more project{actionProjects.length - 3 > 1 ? "s" : ""}</button> needing action
                                </p>
                            )}
                        </div>
                    );
                })()}

                {/* Projects Table */}
                {loading ? (
                    <div className="text-center py-12 text-muted-foreground">Loading...</div>
                ) : projects.length === 0 ? (
                    <Card>
                        <CardContent className="py-16 text-center">
                            <div className="flex justify-center mb-3"><ClipboardList className="h-10 w-10 text-muted-foreground/40" /></div>
                            <p className="text-muted-foreground">No projects assigned yet. Creators will assign projects to you.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Project Title</TableHead>
                                        <TableHead>Platform</TableHead>
                                        <TableHead>Priority</TableHead>
                                        <TableHead>Creator</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Deadline</TableHead>
                                        <TableHead className="text-center">Raw</TableHead>
                                        <TableHead className="text-center">Your Uploads</TableHead>
                                        <TableHead>Last Activity</TableHead>
                                        <TableHead className="text-center">Unread</TableHead>
                                        <TableHead className="text-center">Rating</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {projects.map((project) => (
                                        <TableRow key={project.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => router.push(`/project/${project.id}`)}>
                                            <TableCell className="font-medium max-w-[200px] truncate">{project.title}</TableCell>
                                            <TableCell>
                                                <PlatformBadge platform={project.platform} />
                                            </TableCell>
                                            <TableCell>
                                                <PriorityBadge priority={project.priority} />
                                            </TableCell>
                                            <TableCell>
                                                {project.creator ? (
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarImage src={project.creator.avatar_url} />
                                                            <AvatarFallback className="text-[10px]">{project.creator.name?.[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm">{project.creator.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm italic">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={project.status} />
                                            </TableCell>
                                            <TableCell>
                                                <DeadlineText deadline={project.deadline} />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {(rawFootageMap[project.id] || 0) > 0 ? (
                                                    <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 gap-1.5 px-1.5"><Check className="h-3 w-3" /> {rawFootageMap[project.id]}</Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">None</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-sm font-mono">{uploadsMap[project.id] || 0}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-muted-foreground">{timeAgo(project.last_activity_at)}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {(project.unread_editor_messages || 0) > 0 ? (
                                                    <Badge variant="destructive" className="rounded-full px-1.5 py-0.5 text-[10px]">
                                                        <div className="flex items-center justify-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> {project.unread_editor_messages}</div>
                                                    </Badge>
                                                ) : null}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <StarDisplay rating={project.creator_rating} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-end gap-1">
                                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => router.push(`/project/${project.id}`)}>View</Button>
                                                    {["in_edit", "changes_requested", "briefing"].includes(project.status) && (
                                                        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={uploadingId === project.id} onClick={() => handleUploadClick(project.id)}>
                                                            {uploadingId === project.id ? "Uploading..." : "Upload"}
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                )}

                {/* Recent Activity */}
                {!loading && profile && (
                    <ActivityFeed role="editor" userId={profile.id} />
                )}
            </div>
        </DashboardShell>
    );
}

export default function EditorDashboardPage() {
    return (
        <AuthGuard requiredRole="editor">
            <EditorDashboardContent />
        </AuthGuard>
    );
}
