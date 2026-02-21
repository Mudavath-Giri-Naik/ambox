"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    getCurrentUser,
    getUserProfile,
    getEditorProjects,
    uploadVersion,
    getNextVersionNumber,
} from "@/lib/supabase/helpers";
import AuthGuard from "../../components/AuthGuard";
import DashboardShell from "../../components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const STATUS_VARIANT = { briefing: "secondary", in_edit: "outline", review: "destructive", changes_requested: "outline", approved: "default", completed: "default" };
const STATUS_LABEL = { briefing: "Briefing", in_edit: "In Edit", review: "Review", changes_requested: "Changes Requested", approved: "Approved", completed: "Completed" };

function EditorDashboardContent() {
    const router = useRouter();
    const [profile, setProfile] = useState(null);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploadingId, setUploadingId] = useState(null);
    const fileInputRef = useRef(null);
    const uploadProjectRef = useRef(null);

    const loadData = async () => {
        const user = await getCurrentUser();
        if (!user) return;
        const { profile: p } = await getUserProfile(user.id);
        setProfile(p);
        const { projects: list } = await getEditorProjects(user.id);
        setProjects(list);
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
        await uploadVersion(projectId, user.id, file, nextVersion);
        await loadData();
        setUploadingId(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const totalAssigned = projects.length;
    const activeProjects = projects.filter((p) => ["in_edit", "changes_requested"].includes(p.status)).length;
    const newBriefs = projects.filter((p) => p.status === "briefing").length;

    return (
        <DashboardShell>
            <input type="file" ref={fileInputRef} onChange={handleFileSelected} className="hidden" accept="video/*" />
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground text-sm">Your assigned projects and tasks.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Assigned</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{totalAssigned}</p></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{activeProjects}</p></CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">New Briefs</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{newBriefs}</p></CardContent></Card>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-muted-foreground">Loading...</div>
                ) : projects.length === 0 ? (
                    <Card className="text-center py-12"><CardContent><p className="text-muted-foreground">No projects assigned yet. Creators will assign projects to you.</p></CardContent></Card>
                ) : (
                    <div className="space-y-3">
                        {projects.map((project) => (
                            <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/project/${project.id}`)}>
                                <CardContent className="flex items-center justify-between p-4">
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">{project.title}</p>
                                        <p className="text-xs text-muted-foreground capitalize">{project.platform}</p>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <Badge variant={STATUS_VARIANT[project.status] || "secondary"}>
                                            {STATUS_LABEL[project.status] || project.status}
                                        </Badge>
                                        {project.creator && (
                                            <div className="flex items-center gap-1.5">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={project.creator.avatar_url} />
                                                    <AvatarFallback className="text-xs">{project.creator.name?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-xs text-muted-foreground hidden sm:inline">{project.creator.name}</span>
                                            </div>
                                        )}
                                        {project.unread_editor_count > 0 && (
                                            <Badge variant="destructive" className="rounded-full px-1.5 py-0.5 text-[10px]">{project.unread_editor_count}</Badge>
                                        )}
                                        {["in_edit", "changes_requested", "briefing"].includes(project.status) && (
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <Button size="sm" variant="outline" className="h-7 text-xs" disabled={uploadingId === project.id} onClick={() => handleUploadClick(project.id)}>
                                                    {uploadingId === project.id ? "Uploading..." : "Upload"}
                                                </Button>
                                            </div>
                                        )}
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

export default function EditorDashboardPage() {
    return (
        <AuthGuard requiredRole="editor">
            <EditorDashboardContent />
        </AuthGuard>
    );
}
