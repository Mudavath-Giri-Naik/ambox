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
import AuthGuard from "../../components/AuthGuard";
import DashboardShell from "../../components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { getEditorsList } from "@/lib/supabase/helpers";

const STATUS_VARIANT = {
    briefing: "secondary",
    in_edit: "outline",
    review: "destructive",
    changes_requested: "outline",
    approved: "default",
    completed: "default",
};

const STATUS_LABEL = {
    briefing: "Briefing",
    in_edit: "In Edit",
    review: "Review",
    changes_requested: "Changes Requested",
    approved: "Approved",
    completed: "Completed",
};

function CreatorDashboardContent() {
    const router = useRouter();
    const [profile, setProfile] = useState(null);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [formTitle, setFormTitle] = useState("");
    const [formDesc, setFormDesc] = useState("");
    const [formPlatform, setFormPlatform] = useState("instagram");
    const [formEditor, setFormEditor] = useState("");
    const [editors, setEditors] = useState([]);
    const [creating, setCreating] = useState(false);

    const loadData = async () => {
        const user = await getCurrentUser();
        if (!user) return;
        const { profile: p } = await getUserProfile(user.id);
        setProfile(p);
        const { projects: list } = await getCreatorProjects(user.id);
        setProjects(list);
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
        const user = await getCurrentUser();
        if (!user) return;
        await createProject({ title: formTitle.trim(), description: formDesc.trim(), platform: formPlatform, creatorId: user.id, editorId: formEditor || null });
        setCreateOpen(false);
        setFormTitle(""); setFormDesc(""); setFormPlatform("instagram"); setFormEditor("");
        setCreating(false);
        await loadData();
    };

    const totalProjects = projects.length;
    const inEdit = projects.filter((p) => p.status === "in_edit").length;
    const awaitingReview = projects.filter((p) => p.status === "review").length;

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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Projects</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{totalProjects}</p></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">In Edit</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{inEdit}</p></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Awaiting Review</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{awaitingReview}</p></CardContent></Card>
                </div>

                {/* Projects */}
                {loading ? (
                    <div className="text-center py-12 text-muted-foreground">Loading...</div>
                ) : projects.length === 0 ? (
                    <Card className="text-center py-12"><CardContent><p className="text-muted-foreground mb-4">No projects yet.</p><Button onClick={openCreateDialog}>Create Your First Project</Button></CardContent></Card>
                ) : (
                    <div className="space-y-3">
                        {projects.map((project) => (
                            <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/project/${project.id}`)}>
                                <CardContent className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div>
                                            <p className="font-medium truncate">{project.title}</p>
                                            <p className="text-xs text-muted-foreground capitalize">{project.platform}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <Badge variant={STATUS_VARIANT[project.status] || "secondary"}>
                                            {STATUS_LABEL[project.status] || project.status}
                                        </Badge>
                                        {project.editor && (
                                            <div className="flex items-center gap-1.5">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={project.editor.avatar_url} />
                                                    <AvatarFallback className="text-xs">{project.editor.name?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs text-muted-foreground hidden sm:inline">{project.editor.name}</span>
                                            </div>
                                        )}
                                        {project.unread_creator_count > 0 && (
                                            <Badge variant="destructive" className="rounded-full px-1.5 py-0.5 text-[10px]">{project.unread_creator_count}</Badge>
                                        )}
                                        {project.status === "review" && (
                                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={async () => { await approveProject(project.id); await loadData(); }}>Approve</Button>
                                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={async () => { await requestChanges(project.id); await loadData(); }}>Changes</Button>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
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
                        <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={creating || !formTitle.trim()}>{creating ? "Creating..." : "Create"}</Button>
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
