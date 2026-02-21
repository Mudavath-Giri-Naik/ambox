"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    getCurrentUser, getUserProfile, getProjectById, getProjectVersions,
    getNextVersionNumber, uploadVersion, assignEditor, approveProject,
    completeProject, requestChanges, resetUnreadCount,
} from "@/lib/supabase/helpers";
import AuthGuard from "../../components/AuthGuard";
import DashboardShell from "../../components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import AssignEditorModal from "../../components/AssignEditorModal";

const STATUS_VARIANT = { briefing: "secondary", in_edit: "outline", review: "destructive", changes_requested: "outline", approved: "default", completed: "default" };
const STATUS_LABEL = { briefing: "Briefing", in_edit: "In Edit", review: "Review", changes_requested: "Changes Requested", approved: "Approved", completed: "Completed" };

function ProjectPageContent() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id;
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [project, setProject] = useState(null);
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const fileInputRef = useRef(null);

    const loadData = async () => {
        const currentUser = await getCurrentUser();
        if (!currentUser) return;
        setUser(currentUser);
        const { profile } = await getUserProfile(currentUser.id);
        setUserProfile(profile);
        const { project: p } = await getProjectById(projectId);
        setProject(p);
        const { versions: v } = await getProjectVersions(projectId);
        setVersions(v);
        setLoading(false);
        if (profile?.role) await resetUnreadCount(projectId, profile.role);
    };

    useEffect(() => { loadData(); }, [projectId]);

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setUploading(true);
        const nextVersion = await getNextVersionNumber(projectId);
        await uploadVersion(projectId, user.id, file, nextVersion);
        await loadData();
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleAssign = async (editorId) => {
        await assignEditor(projectId, editorId);
        await loadData();
    };

    if (loading) {
        return <DashboardShell><div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-muted border-t-primary"></div></div></DashboardShell>;
    }

    if (!project) {
        return <DashboardShell><div className="p-12 text-center text-muted-foreground">Project not found.</div></DashboardShell>;
    }

    const isCreator = userProfile?.role === "creator";
    const isEditor = userProfile?.role === "editor";

    return (
        <DashboardShell>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => router.back()}>← Back</Button>
                        <h1 className="text-2xl font-bold tracking-tight">{project.title}</h1>
                        <div className="flex items-center gap-2">
                            <Badge variant={STATUS_VARIANT[project.status]}>{STATUS_LABEL[project.status]}</Badge>
                            <span className="text-sm text-muted-foreground capitalize">{project.platform}</span>
                        </div>
                        {project.description && <p className="text-sm text-muted-foreground mt-1">{project.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                        {isCreator && <Button variant="outline" size="sm" onClick={() => setShowAssignModal(true)}>{project.editor ? "Reassign" : "Assign Editor"}</Button>}
                        {isCreator && project.status === "review" && (
                            <>
                                <Button size="sm" onClick={async () => { await approveProject(projectId); await loadData(); }}>Approve</Button>
                                <Button size="sm" variant="outline" onClick={async () => { await requestChanges(projectId); await loadData(); }}>Request Changes</Button>
                            </>
                        )}
                        {isCreator && project.status === "approved" && (
                            <Button size="sm" onClick={async () => { await completeProject(projectId); await loadData(); }}>Complete</Button>
                        )}
                    </div>
                </div>

                {/* Collaborators */}
                <div className="flex gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Creator:</span>
                        <Avatar className="h-5 w-5"><AvatarImage src={project.creator?.avatar_url} /><AvatarFallback className="text-[10px]">{project.creator?.name?.[0]}</AvatarFallback></Avatar>
                        <span className="font-medium">{project.creator?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Editor:</span>
                        {project.editor ? (<><Avatar className="h-5 w-5"><AvatarImage src={project.editor.avatar_url} /><AvatarFallback className="text-[10px]">{project.editor.name?.[0]}</AvatarFallback></Avatar><span className="font-medium">{project.editor.name}</span></>) : (<span className="text-muted-foreground italic">Not assigned</span>)}
                    </div>
                </div>

                <Separator />

                {/* Tabs */}
                <Tabs defaultValue="versions">
                    <TabsList>
                        <TabsTrigger value="versions">Versions</TabsTrigger>
                        <TabsTrigger value="upload">Upload</TabsTrigger>
                        <TabsTrigger value="details">Details</TabsTrigger>
                    </TabsList>

                    <TabsContent value="versions" className="mt-4 space-y-4">
                        {versions.length === 0 ? (
                            <p className="text-muted-foreground text-center py-8">No versions uploaded yet.</p>
                        ) : versions.map((v) => (
                            <Card key={v.id}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="secondary" className="text-xs">v{v.version_number}</Badge>
                                            <div>
                                                <p className="text-sm font-medium">Version {v.version_number}</p>
                                                <p className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <a href={v.file_url} target="_blank" rel="noopener noreferrer">
                                            <Button variant="outline" size="sm">Download</Button>
                                        </a>
                                    </div>
                                    <div className="rounded-lg overflow-hidden bg-black"><video controls src={v.file_url} className="w-full max-h-80 object-contain" preload="metadata" /></div>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>

                    <TabsContent value="upload" className="mt-4">
                        {isEditor ? (
                            <Card>
                                <CardContent className="p-8 text-center">
                                    <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="video/*" disabled={uploading} />
                                    <div className="text-4xl mb-3">📁</div>
                                    <p className="text-muted-foreground mb-4">{uploading ? "Uploading..." : "Upload a new version"}</p>
                                    <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>{uploading ? "Uploading..." : "Choose File"}</Button>
                                    <p className="text-xs text-muted-foreground mt-3">v{versions.length > 0 ? versions[0].version_number + 1 : 0} · Status → Review</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <p className="text-muted-foreground text-center py-8">Only editors can upload versions.</p>
                        )}
                    </TabsContent>

                    <TabsContent value="details" className="mt-4">
                        <Card>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><p className="text-muted-foreground">Title</p><p className="font-medium">{project.title}</p></div>
                                    <div><p className="text-muted-foreground">Platform</p><p className="font-medium capitalize">{project.platform}</p></div>
                                    <div><p className="text-muted-foreground">Status</p><Badge variant={STATUS_VARIANT[project.status]}>{STATUS_LABEL[project.status]}</Badge></div>
                                    <div><p className="text-muted-foreground">Versions</p><p className="font-medium">{versions.length}</p></div>
                                    <div><p className="text-muted-foreground">Created</p><p className="font-medium">{new Date(project.created_at).toLocaleDateString()}</p></div>
                                    <div><p className="text-muted-foreground">Last Activity</p><p className="font-medium">{new Date(project.last_activity_at).toLocaleString()}</p></div>
                                </div>
                                {project.description && (<div className="pt-4 border-t mt-4"><p className="text-muted-foreground text-sm mb-1">Description</p><p className="text-sm">{project.description}</p></div>)}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {showAssignModal && <AssignEditorModal onClose={() => setShowAssignModal(false)} onAssign={handleAssign} currentEditorId={project.editor_id} />}
        </DashboardShell>
    );
}

export default function ProjectPage() {
    return <AuthGuard><ProjectPageContent /></AuthGuard>;
}
