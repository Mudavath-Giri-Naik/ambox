"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    getCurrentUser,
    getUserProfile,
    getCreatorProjects,
    createProject,
    approveProject,
    requestChanges,
} from "@/lib/supabase/helpers";
import { supabase } from "@/lib/supabaseClient";
import VoiceRecorder from "../../components/VoiceRecorder";
import AuthGuard from "../../components/AuthGuard";
import DashboardShell from "../../components/DashboardShell";
import StatusBadge, { PlatformBadge, PriorityBadge, DeadlineText, isOverdue, getDeadlineText, getDeadlineColor } from "../../components/StatusBadge";
import ActivityFeed from "../../components/ActivityFeed";
import { StarDisplay } from "../../components/ProjectRating";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertCircle, Folder, MessageSquare } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { getEditorsList } from "@/lib/supabase/helpers";

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

function CreatorDashboardContent() {
    const router = useRouter();
    const [profile, setProfile] = useState(null);
    const [projects, setProjects] = useState([]);
    const [versionMap, setVersionMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [formTitle, setFormTitle] = useState("");
    const [formDesc, setFormDesc] = useState("");
    const [formPlatform, setFormPlatform] = useState("instagram");
    const [formEditor, setFormEditor] = useState("");
    const [formDeadline, setFormDeadline] = useState("");
    const [formPriority, setFormPriority] = useState("normal");
    const [formAudioBlob, setFormAudioBlob] = useState(null);
    const [editors, setEditors] = useState([]);
    const [creating, setCreating] = useState(false);
    const [creatingStatus, setCreatingStatus] = useState("");

    const loadData = async () => {
        const user = await getCurrentUser();
        if (!user) return;
        const { profile: p } = await getUserProfile(user.id);
        setProfile(p);
        const { projects: list } = await getCreatorProjects(user.id);
        setProjects(list);

        // Fetch max version number per project
        if (list.length > 0) {
            const projectIds = list.map((p) => p.id);
            const { data: versions } = await supabase
                .from("project_versions")
                .select("project_id, version_number")
                .in("project_id", projectIds)
                .order("version_number", { ascending: false });

            const map = {};
            (versions || []).forEach((v) => {
                if (!map[v.project_id] || v.version_number > map[v.project_id]) {
                    map[v.project_id] = v.version_number;
                }
            });
            setVersionMap(map);
        }

        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const openCreateDialog = async () => {
        const { editors: list } = await getEditorsList();
        setEditors(list);
        setCreateOpen(true);
    };

    const handleCreate = async () => {
        if (!formTitle.trim()) return;
        setCreating(true);
        setCreatingStatus("Creating project...");
        const user = await getCurrentUser();
        if (!user) { setCreating(false); return; }

        const { project: newProject, error } = await createProject({
            title: formTitle.trim(), description: formDesc.trim(), platform: formPlatform,
            creatorId: user.id, editorId: formEditor || null, deadline: formDeadline || null, priority: formPriority
        });

        // Upload voice brief if recorded
        if (!error && newProject && formAudioBlob) {
            try {
                setCreatingStatus("Uploading voice brief...");
                const ext = formAudioBlob.type.includes("ogg") ? "ogg" : "webm";
                const fileName = `briefs/${newProject.id}/voice_${Date.now()}.${ext}`;
                const { error: uploadErr } = await supabase.storage
                    .from("project-briefs")
                    .upload(fileName, formAudioBlob, { contentType: formAudioBlob.type || "audio/webm" });

                if (!uploadErr) {
                    const { data: urlData } = supabase.storage.from("project-briefs").getPublicUrl(fileName);
                    const voiceUrl = urlData?.publicUrl;

                    if (voiceUrl) {
                        await supabase.from("projects").update({ voice_brief_url: voiceUrl }).eq("id", newProject.id);
                        setCreatingStatus("Processing transcript...");
                        // Call the local Next.js API route instead of Supabase Edge Function
                        fetch("/api/transcribe-brief", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ project_id: newProject.id, audio_url: voiceUrl })
                        }).catch(() => { }); // silent if fails
                    }
                }
            } catch (_) { /* non-blocking */ }
        }

        setCreateOpen(false);
        setFormTitle(""); setFormDesc(""); setFormPlatform("instagram"); setFormEditor("");
        setFormDeadline(""); setFormPriority("normal"); setFormAudioBlob(null);
        setCreating(false); setCreatingStatus("");
        await loadData();
    };

    const totalProjects = projects.length;
    const inEdit = projects.filter((p) => ["in_edit", "assigned", "in_progress"].includes(p.status)).length;
    const awaitingReview = projects.filter((p) => p.status === "review").length;
    const changesRequested = projects.filter((p) => p.status === "changes_requested").length;
    const completed = projects.filter((p) => p.status === "completed").length;
    const unreadMessages = projects.reduce((sum, p) => sum + (p.unread_creator_messages || 0), 0);

    return (
        <DashboardShell>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                        <p className="text-muted-foreground text-sm">Your projects and activity overview.</p>
                    </div>
                    <Button onClick={openCreateDialog}>+ New Project</Button>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Projects</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{totalProjects}</p></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">In Edit</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{inEdit}</p></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Awaiting Review</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{awaitingReview}</p></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Changes Requested</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{changesRequested}</p></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{completed}</p></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Unread Messages</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{unreadMessages}</p></CardContent></Card>
                    {(() => {
                        const overdue = projects.filter((p) => isOverdue(p.deadline) && !["completed", "approved"].includes(p.status)).length; return (
                            <Card className={overdue > 0 ? "border-red-300 dark:border-red-800" : ""}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle></CardHeader><CardContent><p className={`text-3xl font-bold ${overdue > 0 ? "text-red-600 dark:text-red-400" : ""}`}>{overdue}</p></CardContent></Card>
                        );
                    })()}
                </div>

                {/* Needs Your Attention */}
                {!loading && (() => {
                    const reviewProjects = projects
                        .filter((p) => p.status === "review")
                        .sort((a, b) => {
                            const pOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
                            const pa = pOrder[a.priority] ?? 2, pb = pOrder[b.priority] ?? 2;
                            if (pa !== pb) return pa - pb;
                            if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
                            if (a.deadline) return -1;
                            if (b.deadline) return 1;
                            return 0;
                        });
                    if (reviewProjects.length === 0) return null;
                    const displayed = reviewProjects.slice(0, 3);
                    return (
                        <div className="space-y-3">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-amber-500" /> Needs Your Attention
                                <Badge variant="secondary" className="text-xs">{reviewProjects.length}</Badge>
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {displayed.map((project) => (
                                    <Card key={project.id} className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                                        <CardContent className="p-4 space-y-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="font-medium truncate">{project.title}</p>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {["high", "urgent"].includes(project.priority) && <PriorityBadge priority={project.priority} />}
                                                    <StatusBadge status="review" />
                                                </div>
                                            </div>
                                            {project.editor && (
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-5 w-5">
                                                        <AvatarImage src={project.editor.avatar_url} />
                                                        <AvatarFallback className="text-[10px]">{project.editor.name?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm text-muted-foreground">{project.editor.name}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground">
                                                    {versionMap[project.id] !== undefined ? `v${versionMap[project.id]} uploaded` : "New version uploaded"} · {timeAgo(project.last_activity_at)}
                                                </span>
                                                {project.deadline && <DeadlineText deadline={project.deadline} />}
                                            </div>
                                            <Button size="sm" className="w-full h-8 text-xs" onClick={() => router.push(`/project/${project.id}`)}>Review Now</Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                            {reviewProjects.length > 3 && (
                                <p className="text-sm text-muted-foreground">
                                    and <button className="text-primary underline underline-offset-2 hover:text-primary/80" onClick={() => { }}>{reviewProjects.length - 3} more project{reviewProjects.length - 3 > 1 ? "s" : ""}</button> awaiting review
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
                            <div className="flex justify-center mb-3"><Folder className="h-10 w-10 text-muted-foreground/40" /></div>
                            <p className="text-muted-foreground mb-4">No projects yet.</p>
                            <Button onClick={openCreateDialog}>Create Your First Project</Button>
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
                                        <TableHead>Editor</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Deadline</TableHead>
                                        <TableHead className="text-center">Version</TableHead>
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
                                                {project.editor ? (
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarImage src={project.editor.avatar_url} />
                                                            <AvatarFallback className="text-[10px]">{project.editor.name?.[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-sm">{project.editor.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm italic">Not assigned</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={project.status} />
                                            </TableCell>
                                            <TableCell>
                                                <DeadlineText deadline={project.deadline} />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-sm font-mono">
                                                    {versionMap[project.id] !== undefined ? `v${versionMap[project.id]}` : "—"}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-muted-foreground">{timeAgo(project.last_activity_at)}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {(project.unread_creator_messages || 0) > 0 ? (
                                                    <Badge variant="destructive" className="rounded-full px-1.5 py-0.5 text-[10px]">
                                                        <div className="flex items-center justify-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> {project.unread_creator_messages}</div>
                                                    </Badge>
                                                ) : null}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <StarDisplay rating={project.creator_rating} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-end gap-1">
                                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => router.push(`/project/${project.id}`)}>View</Button>
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
                    <ActivityFeed role="creator" userId={profile.id} />
                )}
            </div>

            {/* Create Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New Project</DialogTitle>
                        <DialogDescription>Create a project and optionally assign an editor.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Title</label>
                            <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="My video project" disabled={creating} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Brief for the editor..." disabled={creating} />
                        </div>
                        <VoiceRecorder onChange={setFormAudioBlob} disabled={creating} />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Deadline (optional)</label>
                                <Input type="date" value={formDeadline} onChange={(e) => setFormDeadline(e.target.value)} disabled={creating} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Priority</label>
                                <Select value={formPriority} onValueChange={setFormPriority} disabled={creating}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Platform</label>
                            <Select value={formPlatform} onValueChange={setFormPlatform} disabled={creating}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="instagram">Instagram</SelectItem>
                                    <SelectItem value="youtube">YouTube</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Assign Editor</label>
                            <Select value={formEditor} onValueChange={setFormEditor} disabled={creating}>
                                <SelectTrigger><SelectValue placeholder="None — assign later" /></SelectTrigger>
                                <SelectContent>
                                    {editors.map((ed) => <SelectItem key={ed.id} value={ed.id}>{ed.name || ed.email}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setCreateOpen(false); setFormAudioBlob(null); }} disabled={creating}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={creating || !formTitle.trim()}>
                            {creating ? (creatingStatus || "Creating...") : "Create Project"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardShell>
    );
}

export default function CreatorDashboardPage() {
    return (
        <AuthGuard requiredRole="creator">
            <CreatorDashboardContent />
        </AuthGuard>
    );
}
