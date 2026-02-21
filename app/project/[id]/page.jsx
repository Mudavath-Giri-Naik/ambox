"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    getCurrentUser, getUserProfile, getProjectById, getProjectVersions,
    getNextVersionNumber, uploadVersion, assignEditor, approveProject,
    completeProject, requestChanges, resetUnreadCount, acceptAssignment, rejectAssignment,
} from "@/lib/supabase/helpers";
import AuthGuard from "../../components/AuthGuard";
import DashboardShell from "../../components/DashboardShell";
import ProjectChat from "../../components/ProjectChat";
import StatusBadge from "../../components/StatusBadge";
import ProjectRating from "../../components/ProjectRating";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import AssignEditorModal from "../../components/AssignEditorModal";



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
    const rawFileInputRef = useRef(null);
    const editedFileInputRef = useRef(null);

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

    const handleRawUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setUploading(true);
        await uploadVersion(projectId, user.id, file, 0, "raw");
        await loadData();
        setUploading(false);
        if (rawFileInputRef.current) rawFileInputRef.current.value = "";
    };

    const handleEditedUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setUploading(true);
        const nextVersion = await getNextVersionNumber(projectId);
        await uploadVersion(projectId, user.id, file, nextVersion, "edited");
        await loadData();
        setUploading(false);
        if (editedFileInputRef.current) editedFileInputRef.current.value = "";
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
    const rawFootage = versions.filter((v) => v.type === "raw");
    const editedVersions = versions.filter((v) => v.type === "edited" || (!v.type && v.version_number > 0));
    const hasRawFootage = rawFootage.length > 0;
    const canCreatorUploadRaw = isCreator && !["completed", "approved"].includes(project.status);
    const canEditorUploadEdited = isEditor && ["assigned", "in_progress", "in_edit", "changes_requested"].includes(project.status);

    return (
        <DashboardShell>
            <input type="file" ref={rawFileInputRef} onChange={handleRawUpload} className="hidden" accept="video/*,image/*" disabled={uploading} />
            <input type="file" ref={editedFileInputRef} onChange={handleEditedUpload} className="hidden" accept="video/*" disabled={uploading} />
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={() => router.back()}>← Back</Button>
                        <h1 className="text-2xl font-bold tracking-tight">{project.title}</h1>
                        <div className="flex items-center gap-2">
                            <StatusBadge status={project.status} />
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
                        {isEditor && project.status === "pending_acceptance" && (
                            <>
                                <Button size="sm" onClick={async () => { await acceptAssignment(projectId); await loadData(); }}>Accept</Button>
                                <Button size="sm" variant="destructive" onClick={async () => { await rejectAssignment(projectId); await loadData(); }}>Reject</Button>
                            </>
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

                {/* Rating prompt for completed/approved projects */}
                <ProjectRating project={project} isCreator={isCreator} onRated={loadData} />

                {/* Tabs */}
                <Tabs defaultValue="chat">
                    <TabsList>
                        <TabsTrigger value="chat">Chat</TabsTrigger>
                        <TabsTrigger value="versions">Versions</TabsTrigger>
                        <TabsTrigger value="upload">Upload</TabsTrigger>
                        <TabsTrigger value="details">Details</TabsTrigger>
                    </TabsList>

                    {/* CHAT TAB */}
                    <TabsContent value="chat" className="mt-4">
                        {project.editor ? (
                            <ProjectChat
                                projectId={projectId}
                                currentUser={user}
                                userProfile={userProfile}
                                project={project}
                            />
                        ) : (
                            <Card>
                                <CardContent className="p-8 text-center">
                                    <div className="text-4xl mb-3">👥</div>
                                    <p className="text-muted-foreground mb-4">
                                        Assign an editor to start chatting
                                    </p>
                                    {isCreator && (
                                        <Button onClick={() => setShowAssignModal(true)}>
                                            Assign Editor
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* VERSIONS TAB — separated into raw + edited */}
                    <TabsContent value="versions" className="mt-4 space-y-6">
                        {/* Raw Footage Section */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                🎬 Raw Footage
                                <Badge variant="secondary" className="text-[10px]">{rawFootage.length}</Badge>
                            </h3>
                            {rawFootage.length === 0 ? (
                                <p className="text-muted-foreground text-sm py-4 text-center border rounded-lg border-dashed">No raw footage uploaded yet.</p>
                            ) : rawFootage.map((v) => (
                                <Card key={v.id} className="border-blue-200 dark:border-blue-900">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Raw</Badge>
                                                <div>
                                                    <p className="text-sm font-medium">Original Footage</p>
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
                        </div>

                        <Separator />

                        {/* Edited Versions Section */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                ✂️ Edited Versions
                                <Badge variant="secondary" className="text-[10px]">{editedVersions.length}</Badge>
                            </h3>
                            {editedVersions.length === 0 ? (
                                <p className="text-muted-foreground text-sm py-4 text-center border rounded-lg border-dashed">No edited versions uploaded yet.</p>
                            ) : editedVersions.map((v) => (
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
                        </div>
                    </TabsContent>

                    {/* UPLOAD TAB — role-aware */}
                    <TabsContent value="upload" className="mt-4 space-y-4">
                        {/* Creator: Upload Raw Footage */}
                        {isCreator && (
                            <Card className={canCreatorUploadRaw ? "border-blue-200 dark:border-blue-900" : ""}>
                                <CardContent className="p-8 text-center">
                                    <div className="text-4xl mb-3">🎬</div>
                                    <p className="font-medium mb-1">Upload Raw Footage</p>
                                    <p className="text-muted-foreground text-sm mb-4">
                                        {hasRawFootage
                                            ? "Raw footage already uploaded. You can upload again to replace."
                                            : "Upload your raw footage for the editor to work with."}
                                    </p>
                                    {canCreatorUploadRaw ? (
                                        <Button onClick={() => rawFileInputRef.current?.click()} disabled={uploading}>
                                            {uploading ? "Uploading..." : hasRawFootage ? "Replace Raw Footage" : "Choose File"}
                                        </Button>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">
                                            Raw footage can only be uploaded when project is in Briefing or Assigned status.
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Editor: Upload Edited Version */}
                        {isEditor && (
                            <Card className={canEditorUploadEdited ? "" : ""}>
                                <CardContent className="p-8 text-center">
                                    <div className="text-4xl mb-3">✂️</div>
                                    <p className="font-medium mb-1">Upload Edited Version</p>
                                    {!hasRawFootage ? (
                                        <p className="text-muted-foreground text-sm mb-4">Waiting for creator to upload raw footage first.</p>
                                    ) : canEditorUploadEdited ? (
                                        <>
                                            <p className="text-muted-foreground text-sm mb-4">
                                                Upload your edited version. This will be v{editedVersions.length > 0 ? editedVersions[0].version_number + 1 : 1} and status will change to Review.
                                            </p>
                                            <Button onClick={() => editedFileInputRef.current?.click()} disabled={uploading}>
                                                {uploading ? "Uploading..." : "Choose File"}
                                            </Button>
                                        </>
                                    ) : (
                                        <p className="text-xs text-muted-foreground mt-2">
                                            You can upload when project status is Assigned, In Progress, or Changes Requested.
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Neither creator nor editor */}
                        {!isCreator && !isEditor && (
                            <p className="text-muted-foreground text-center py-8">You don't have upload permissions for this project.</p>
                        )}
                    </TabsContent>

                    <TabsContent value="details" className="mt-4">
                        <Card>
                            <CardContent className="p-6">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><p className="text-muted-foreground">Title</p><p className="font-medium">{project.title}</p></div>
                                    <div><p className="text-muted-foreground">Platform</p><p className="font-medium capitalize">{project.platform}</p></div>
                                    <div><p className="text-muted-foreground">Status</p><StatusBadge status={project.status} /></div>
                                    <div><p className="text-muted-foreground">Versions</p><p className="font-medium">{versions.length}</p></div>
                                    <div><p className="text-muted-foreground">Created</p><p className="font-medium">{new Date(project.created_at).toLocaleDateString()}</p></div>
                                    <div><p className="text-muted-foreground">Last Activity</p><p className="font-medium">{new Date(project.last_activity_at).toLocaleString()}</p></div>
                                </div>
                                {project.description && (<div className="pt-4 border-t mt-4"><p className="text-muted-foreground text-sm mb-1">Description</p><p className="text-sm">{project.description}</p></div>)}
                            </CardContent>
                        </Card>
                        {/* Rating display in details */}
                        {project.creator_rating != null && (
                            <Card>
                                <CardContent className="p-6">
                                    <p className="text-muted-foreground text-sm mb-2">Creator Rating</p>
                                    <ProjectRating project={project} isCreator={false} />
                                </CardContent>
                            </Card>
                        )}
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
