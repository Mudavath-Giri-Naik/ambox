"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    getCurrentUser, getUserProfile, getProjectById, getProjectVersions,
    getNextVersionNumber, uploadVersion, deleteVersion, assignEditor, approveProject,
    completeProject, requestChanges, resetUnreadCount, acceptAssignment, rejectAssignment,
} from "@/lib/supabase/helpers";
import AuthGuard from "../../components/AuthGuard";
import DashboardShell from "../../components/DashboardShell";
import ProjectChat from "../../components/ProjectChat";
import StatusBadge, { PlatformBadge, DeadlineText } from "../../components/StatusBadge";
import ProjectRating from "../../components/ProjectRating";
import VoiceBriefDisplay from "../../components/VoiceBriefDisplay";
import VideoCommentModal from "../../components/VideoCommentModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import AssignEditorModal from "../../components/AssignEditorModal";
import {
    MessageSquare, Film, Upload, Info, Download, ArrowLeft, Plus, X,
    FileVideo, CheckCircle, XCircle, UserPlus, AlertCircle, Clapperboard,
    Scissors, Calendar, Star, Users, Trash2, ClipboardList, FolderOpen, FileText, BarChart3
} from "lucide-react";

const NEW_TABS = [
    { id: "requirements", label: "Requirements", icon: ClipboardList },
    { id: "versions", label: "Versions", icon: Film },
    { id: "info", label: "Project Info", icon: Info },
];

function UploadOverlay() {
    return (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 z-10 rounded-lg">
            <div className="relative">
                <div className="h-7 w-7 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <Upload className="h-3 w-3 text-primary absolute inset-0 m-auto" />
            </div>
            <span className="text-xs font-medium text-primary">Uploading...</span>
            <div className="w-28 h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full w-3/5 bg-primary rounded-full animate-pulse" />
            </div>
        </div>
    );
}

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
    const [activeTab, setActiveTab] = useState("requirements");
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showRawForm, setShowRawForm] = useState(false);
    const [rawComment, setRawComment] = useState("");
    const [rawFile, setRawFile] = useState(null);
    const [commentModalVersion, setCommentModalVersion] = useState(null);
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

    const handleRawFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) setRawFile(file);
        if (rawFileInputRef.current) rawFileInputRef.current.value = "";
    };

    const handleRawUploadSubmit = async () => {
        if (!rawFile || !user) return;
        setUploading(true);
        const rawCount = versions.filter((v) => v.type === "raw" || (!v.type && v.version_number === 0)).length;
        const result = await uploadVersion(projectId, user.id, rawFile, rawCount, "raw", rawComment.trim() || null);
        if (result.error) { alert("Upload failed: " + result.error.message); setUploading(false); return; }
        setRawFile(null); setRawComment(""); setShowRawForm(false);
        await loadData(); setUploading(false);
    };

    const handleDeleteVersion = async (versionId, fileUrl) => {
        if (!confirm("Delete this video? This cannot be undone.")) return;
        const { error } = await deleteVersion(versionId, fileUrl);
        if (error) { alert("Delete failed: " + error.message); return; }
        await loadData();
    };

    const handleEditedUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setUploading(true);
        const nextVersion = await getNextVersionNumber(projectId);
        const result = await uploadVersion(projectId, user.id, file, nextVersion, "edited");
        if (result.error) { alert("Upload failed: " + result.error.message); setUploading(false); return; }
        await loadData(); setUploading(false);
        if (editedFileInputRef.current) editedFileInputRef.current.value = "";
    };

    if (loading) {
        return (
            <DashboardShell>
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-muted border-t-primary" />
                </div>
            </DashboardShell>
        );
    }

    if (!project) {
        return (
            <DashboardShell>
                <div className="flex items-center justify-center h-full text-muted-foreground">Project not found.</div>
            </DashboardShell>
        );
    }

    const isCreator = userProfile?.role === "creator";
    const isEditor = userProfile?.role === "editor";
    const rawFootage = versions.filter((v) => v.type === "raw" || (!v.type && v.version_number === 0));
    const editedVersions = versions.filter((v) => v.type === "edited" || (!v.type && v.version_number > 0));
    const hasRawFootage = rawFootage.length > 0;
    const canCreatorUploadRaw = isCreator && !["completed", "approved"].includes(project.status);
    const canEditorUploadEdited = isEditor && ["assigned", "in_progress", "in_edit", "changes_requested"].includes(project.status);
    const showStickyBar = isCreator && project.status === "review" && activeTab === "versions";

    return (
        <DashboardShell
            headerContent={
                <>
                    <StatusBadge status={project.status} />
                    <PlatformBadge platform={project.platform} />
                    <span className="text-sm font-semibold truncate max-w-[220px]">{project.title}</span>
                </>
            }
        >
            <input type="file" ref={rawFileInputRef} onChange={handleRawFileSelect} className="hidden" accept="video/*,audio/*,.pdf,.doc,.docx,.txt" disabled={uploading} />
            <input type="file" ref={editedFileInputRef} onChange={handleEditedUpload} className="hidden" accept="video/*" disabled={uploading} />

            <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-background">

                {/* ───── PROJECT HEADER ───── */}
                {/* ───── SLIM TAB BAR ───── */}
                <div className="shrink-0 border-b bg-background flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {/* Back button */}
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>

                    <Separator orientation="vertical" className="h-5 mx-1" />

                    {/* Tabs */}
                    {NEW_TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-medium border-b-2 transition-colors -mb-px whitespace-nowrap
                                    ${isActive
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                                    }`}
                            >
                                <span><tab.icon className="h-4 w-4" /></span>
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        );
                    })}

                    <span className="flex-1" />

                    {/* Action buttons (right side) */}
                    {isCreator && (
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 shrink-0" onClick={() => setShowAssignModal(true)}>
                            <UserPlus className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{project.editor ? "Reassign" : "Assign Editor"}</span>
                        </Button>
                    )}
                    {isCreator && project.status === "approved" && (
                        <Button size="sm" className="h-7 text-xs gap-1.5 shrink-0" onClick={async () => { await completeProject(projectId); await loadData(); }}>
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Complete</span>
                        </Button>
                    )}
                    {isEditor && project.status === "pending_acceptance" && (
                        <>
                            <Button size="sm" className="h-7 text-xs gap-1.5 bg-green-600 hover:bg-green-700" onClick={async () => { await acceptAssignment(projectId); await loadData(); }}>
                                <CheckCircle className="h-3.5 w-3.5" /> Accept
                            </Button>
                            <Button size="sm" variant="destructive" className="h-7 text-xs gap-1.5" onClick={async () => { await rejectAssignment(projectId); await loadData(); }}>
                                <XCircle className="h-3.5 w-3.5" /> Reject
                            </Button>
                        </>
                    )}
                </div>

                {/* ───── MAIN CONTENT (left panel + right chat) ───── */}
                <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

                    {/* LEFT: Tab content */}
                    <div className="flex-1 flex flex-col overflow-hidden relative">
                        <div className="flex-1 overflow-y-auto no-scrollbar">

                            {/* ═══ TAB 1: REQUIREMENTS ═══ */}
                            {activeTab === "requirements" && (
                                <div className="p-3 sm:p-6 space-y-6 max-w-4xl">

                                    {/* ── Section A: Raw Materials (FIRST) ── */}
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2.5">
                                                <h2 className="text-sm font-semibold tracking-tight flex items-center gap-1.5"><FolderOpen className="h-4 w-4" /> Raw Materials</h2>
                                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono">{rawFootage.length}</Badge>
                                            </div>
                                            {canCreatorUploadRaw && !showRawForm && (
                                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 shadow-sm" onClick={() => setShowRawForm(true)}>
                                                    <Plus className="h-3 w-3" /> Upload Raw
                                                </Button>
                                            )}
                                        </div>

                                        {/* Blog-section inspired card grid */}
                                        {rawFootage.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                {rawFootage.map((v, i) => (
                                                    <div key={v.id} className="group rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                                                        {/* Thumbnail — 16:9 with hover play overlay */}
                                                        <div className="relative aspect-video bg-black/95 overflow-hidden">
                                                            <video
                                                                src={v.file_url}
                                                                className="w-full h-full object-cover"
                                                                preload="metadata"
                                                                muted
                                                                playsInline
                                                                onMouseEnter={(e) => { e.target._playPromise = e.target.play(); }}
                                                                onMouseLeave={(e) => { const p = e.target._playPromise; if (p) p.then(() => { e.target.pause(); e.target.currentTime = 0; }).catch(() => { }); else { e.target.pause(); e.target.currentTime = 0; } }}
                                                            />
                                                            {/* Gradient overlay */}
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            {/* Badge top-left */}
                                                            <Badge className="absolute top-2 left-2 text-[9px] bg-blue-600/90 text-white border-0 shadow-sm backdrop-blur-sm h-5 px-1.5">
                                                                Raw #{i + 1}
                                                            </Badge>
                                                            {/* Actions overlay bottom-right */}
                                                            <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <a href={v.file_url} target="_blank" rel="noopener noreferrer">
                                                                    <Button variant="secondary" size="icon" className="h-6 w-6 bg-white/90 hover:bg-white shadow-sm backdrop-blur-sm"><Download className="h-3 w-3 text-foreground" /></Button>
                                                                </a>
                                                                <Button variant="secondary" size="icon" className="h-6 w-6 bg-white/90 hover:bg-white shadow-sm backdrop-blur-sm" onClick={() => handleDeleteVersion(v.id, v.file_url)}>
                                                                    <Trash2 className="h-3 w-3 text-destructive" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        {/* Card body */}
                                                        <div className="p-3 space-y-1.5">
                                                            {v.comment && (
                                                                <p className="text-[11px] text-foreground font-medium leading-snug line-clamp-2">{v.comment}</p>
                                                            )}
                                                            <div className="flex items-center justify-between gap-1">
                                                                <span className="text-[10px] text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</span>
                                                                <Button
                                                                    type="button" variant="ghost" size="sm"
                                                                    className="h-6 text-[10px] gap-1 px-1.5 text-muted-foreground hover:text-foreground"
                                                                    onClick={() => setCommentModalVersion({ version: v, label: `Raw #${i + 1}` })}
                                                                >
                                                                    <MessageSquare className="h-3 w-3" /> Comments
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : !showRawForm ? (
                                            <div className="rounded-xl border-2 border-dashed py-10 text-center text-sm text-muted-foreground bg-muted/10">
                                                <FileVideo className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                                                {isCreator ? "No raw materials uploaded yet. Click \"Upload Raw\" to add files." : "No raw materials uploaded yet."}
                                            </div>
                                        ) : null}

                                        {/* Upload form */}
                                        {showRawForm && canCreatorUploadRaw && (
                                            <div className="mt-4 border rounded-xl p-4 space-y-3 bg-muted/10 relative overflow-hidden shadow-sm">
                                                {uploading && <UploadOverlay />}
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-semibold">New Raw Material</p>
                                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setShowRawForm(false); setRawFile(null); setRawComment(""); }}>
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                                <div
                                                    onClick={() => rawFileInputRef.current?.click()}
                                                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${rawFile ? "border-primary/50 bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"}`}
                                                >
                                                    {rawFile ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <FileVideo className="h-4 w-4 text-primary" />
                                                            <span className="text-xs font-medium truncate max-w-[180px]">{rawFile.name}</span>
                                                            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={(e) => { e.stopPropagation(); setRawFile(null); }}>
                                                                <X className="h-2.5 w-2.5" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                                                            <p className="text-xs text-muted-foreground">Click to choose file</p>
                                                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Video, audio, PDF, document</p>
                                                        </>
                                                    )}
                                                </div>
                                                <textarea
                                                    value={rawComment}
                                                    onChange={(e) => setRawComment(e.target.value)}
                                                    placeholder="Caption or note (optional)..."
                                                    rows={2}
                                                    className="w-full border border-input rounded-md px-3 py-2 text-xs resize-none bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                                    disabled={uploading}
                                                />
                                                <div className="flex gap-2">
                                                    <Button size="sm" className="h-7 text-xs gap-1" onClick={handleRawUploadSubmit} disabled={!rawFile || uploading}>
                                                        <Upload className="h-3 w-3" /> {uploading ? "Uploading..." : "Upload"}
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowRawForm(false); setRawFile(null); setRawComment(""); }} disabled={uploading}>Cancel</Button>
                                                </div>
                                            </div>
                                        )}

                                        {!canCreatorUploadRaw && isCreator && (
                                            <p className="text-[10px] text-muted-foreground mt-2">Uploads disabled when project is completed/approved.</p>
                                        )}
                                    </div>

                                    <Separator />

                                    {/* ── Section B: Editing Instructions + Voice Brief ── */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <h2 className="text-sm font-semibold tracking-tight flex items-center gap-1.5"><ClipboardList className="h-4 w-4" /> Editing Instructions</h2>
                                            {/* Brief Description — compact info icon dialog */}
                                            {project.description && (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" title="View Brief Description">
                                                            <Info className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-md">
                                                        <DialogHeader>
                                                            <DialogTitle className="flex items-center gap-1.5"><FileText className="h-4 w-4" /> Brief Description</DialogTitle>
                                                        </DialogHeader>
                                                        <p className="text-sm leading-relaxed text-foreground">{project.description}</p>
                                                    </DialogContent>
                                                </Dialog>
                                            )}
                                        </div>
                                        {project.voice_brief_url ? (
                                            <VoiceBriefDisplay project={project} onRefetch={loadData} />
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic">No editing instructions available yet.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ═══ TAB 2: VERSIONS ═══ */}
                            {activeTab === "versions" && (
                                <div className="p-3 sm:p-6 space-y-5 max-w-4xl">
                                    {/* Header row */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <h2 className="text-sm font-semibold tracking-tight flex items-center gap-1.5"><Film className="h-4 w-4" /> Edited Versions</h2>
                                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono">{editedVersions.length}</Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {canEditorUploadEdited && (
                                                <div className="relative">
                                                    {uploading && (
                                                        <div className="absolute inset-0 bg-background/80 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-md">
                                                            <div className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                                                        </div>
                                                    )}
                                                    <Button size="sm" className="gap-1.5 h-7 text-xs shadow-sm" onClick={() => editedFileInputRef.current?.click()} disabled={uploading}>
                                                        <Upload className="h-3 w-3" /> {uploading ? "Uploading..." : "Upload Version"}
                                                    </Button>
                                                </div>
                                            )}
                                            {!canEditorUploadEdited && isEditor && (
                                                <Badge variant="outline" className="text-[10px]">Not available in current status</Badge>
                                            )}
                                            {!hasRawFootage && isEditor && (
                                                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300">Waiting for raw footage</Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Blog-section inspired card grid */}
                                    {editedVersions.length === 0 ? (
                                        <div className="rounded-xl border-2 border-dashed py-10 text-center text-sm text-muted-foreground bg-muted/10">
                                            <Film className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                                            No edited versions uploaded yet.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            {editedVersions.map((v, i) => {
                                                const isLatest = i === 0;
                                                return (
                                                    <div key={v.id} className={`group rounded-xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 ${isLatest ? "ring-1 ring-primary/30" : ""}`}>
                                                        {/* Thumbnail — 16:9 with hover play */}
                                                        <div className="relative aspect-video bg-black/95 overflow-hidden">
                                                            <video
                                                                src={v.file_url}
                                                                className="w-full h-full object-cover"
                                                                preload="metadata"
                                                                muted
                                                                playsInline
                                                                onMouseEnter={(e) => { e.target._playPromise = e.target.play(); }}
                                                                onMouseLeave={(e) => { const p = e.target._playPromise; if (p) p.then(() => { e.target.pause(); e.target.currentTime = 0; }).catch(() => { }); else { e.target.pause(); e.target.currentTime = 0; } }}
                                                            />
                                                            {/* Gradient overlay */}
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            {/* Version badge top-left */}
                                                            <Badge className={`absolute top-2 left-2 text-[9px] border-0 shadow-sm backdrop-blur-sm h-5 px-1.5 ${isLatest ? "bg-primary/90 text-primary-foreground" : "bg-black/70 text-white"}`}>
                                                                v{v.version_number}{isLatest ? " · Latest" : ""}
                                                            </Badge>
                                                            {/* Actions overlay bottom-right */}
                                                            <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {!isLatest && (
                                                                    <Button variant="secondary" size="icon" className="h-6 w-6 bg-white/90 hover:bg-white shadow-sm backdrop-blur-sm" onClick={() => window.open(v.file_url, "_blank")}>
                                                                        <Film className="h-3 w-3 text-foreground" />
                                                                    </Button>
                                                                )}
                                                                <a href={v.file_url} target="_blank" rel="noopener noreferrer">
                                                                    <Button variant="secondary" size="icon" className="h-6 w-6 bg-white/90 hover:bg-white shadow-sm backdrop-blur-sm"><Download className="h-3 w-3 text-foreground" /></Button>
                                                                </a>
                                                                <Button variant="secondary" size="icon" className="h-6 w-6 bg-white/90 hover:bg-white shadow-sm backdrop-blur-sm" onClick={() => handleDeleteVersion(v.id, v.file_url)}>
                                                                    <Trash2 className="h-3 w-3 text-destructive" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        {/* Card body */}
                                                        <div className="p-3 space-y-1.5">
                                                            {/* Status + uploader row */}
                                                            <div className="flex items-center gap-1.5">
                                                                <StatusBadge status={project.status} />
                                                                <span className="flex-1" />
                                                                <Avatar className="h-4 w-4">
                                                                    <AvatarImage src={v.uploader?.avatar_url} />
                                                                    <AvatarFallback className="text-[7px]">{v.uploader?.name?.[0] || "?"}</AvatarFallback>
                                                                </Avatar>
                                                            </div>
                                                            {/* Comment */}
                                                            {v.comment && (
                                                                <p className="text-[11px] text-foreground font-medium leading-snug line-clamp-2">{v.comment}</p>
                                                            )}
                                                            {/* Date + Comments button */}
                                                            <div className="flex items-center justify-between gap-1">
                                                                <span className="text-[10px] text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</span>
                                                                <Button
                                                                    type="button" variant="ghost" size="sm"
                                                                    className="h-6 text-[10px] gap-1 px-1.5 text-muted-foreground hover:text-foreground"
                                                                    onClick={() => setCommentModalVersion({ version: v, label: `v${v.version_number}` })}
                                                                >
                                                                    <MessageSquare className="h-3 w-3" /> Comments
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ═══ TAB 3: PROJECT INFO ═══ */}
                            {activeTab === "info" && (
                                <div className="p-3 sm:p-6 space-y-5 max-w-3xl">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                                        {/* Project Details */}
                                        <Card>
                                            <CardHeader className="pb-3 pt-4 px-5">
                                                <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Project Details</CardTitle>
                                            </CardHeader>
                                            <CardContent className="px-5 pb-4 space-y-3">
                                                {[
                                                    ["Title", project.title],
                                                    ["Platform", <PlatformBadge key="p" platform={project.platform} />],
                                                    ["Status", <StatusBadge key="s" status={project.status} />],
                                                    ["Priority", <span key="pr" className="text-sm capitalize">{project.priority || "—"}</span>],
                                                    ["Deadline", project.deadline ? new Date(project.deadline).toLocaleDateString() : "—"],
                                                    ["Versions", `${rawFootage.length} raw · ${editedVersions.length} edited`],
                                                    ["Created", new Date(project.created_at).toLocaleDateString()],
                                                    ["Last Activity", new Date(project.last_activity_at).toLocaleString()],
                                                ].map(([label, val]) => (
                                                    <div key={label} className="flex items-start gap-2">
                                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide w-24 shrink-0 pt-0.5">{label}</span>
                                                        <span className="text-xs font-medium flex-1">{val}</span>
                                                    </div>
                                                ))}
                                                {project.description && (
                                                    <>
                                                        <Separator />
                                                        <div>
                                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                                                            <p className="text-xs leading-relaxed">{project.description}</p>
                                                        </div>
                                                    </>
                                                )}
                                                {isCreator && (
                                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 mt-2" onClick={() => setShowAssignModal(true)}>
                                                        <UserPlus className="h-3 w-3" /> Change Editor
                                                    </Button>
                                                )}
                                            </CardContent>
                                        </Card>

                                        {/* Collaborators */}
                                        <div className="space-y-4">
                                            <Card>
                                                <CardHeader className="pb-3 pt-4 px-5">
                                                    <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Collaborators</CardTitle>
                                                </CardHeader>
                                                <CardContent className="px-5 pb-4 space-y-3">
                                                    {[
                                                        { label: "Creator • Project Owner", person: project.creator },
                                                        { label: "Editor • Assigned", person: project.editor },
                                                    ].map(({ label, person }) => (
                                                        <div key={label} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40">
                                                            <Avatar className="h-8 w-8 shrink-0">
                                                                <AvatarImage src={person?.avatar_url} />
                                                                <AvatarFallback className="text-xs">{person?.name?.[0] || "?"}</AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium truncate">{person?.name || <span className="text-muted-foreground italic text-xs">Not assigned</span>}</p>
                                                                <p className="text-[10px] text-muted-foreground">{label}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </CardContent>
                                            </Card>

                                            {/* Rating */}
                                            {project.creator_rating != null && (
                                                <Card>
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center gap-2 mb-2"><Star className="h-3.5 w-3.5 text-muted-foreground" /><p className="text-xs font-semibold">Editor Rating</p></div>
                                                        <ProjectRating project={project} isCreator={false} />
                                                    </CardContent>
                                                </Card>
                                            )}
                                            {["completed", "approved"].includes(project.status) && isCreator && (
                                                <ProjectRating project={project} isCreator={isCreator} onRated={loadData} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ───── STICKY ACTION BAR (creator, review, versions tab) ───── */}
                        {showStickyBar && (
                            <div className="shrink-0 border-t bg-background/95 backdrop-blur px-6 py-3 flex items-center justify-end gap-3 shadow-sm">
                                <span className="text-xs text-muted-foreground mr-auto">Review the latest version and take action:</span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 border-orange-400 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                                    onClick={async () => { await requestChanges(projectId); await loadData(); }}
                                >
                                    <AlertCircle className="h-3.5 w-3.5" /> Request Changes
                                </Button>
                                <Button
                                    size="sm"
                                    className="gap-1.5 bg-green-600 hover:bg-green-700"
                                    onClick={async () => { await approveProject(projectId); await loadData(); }}
                                >
                                    <CheckCircle className="h-3.5 w-3.5" /> Approve Version
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Chat — always visible */}
                    <div className="w-full lg:w-[360px] shrink-0 border-t lg:border-l flex flex-col overflow-hidden h-[45vh] lg:h-auto">
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/20 shrink-0">
                            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-[13px] font-medium">Chat</span>
                            {project.editor && (
                                <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Avatar className="h-4 w-4">
                                        <AvatarImage src={project.editor.avatar_url} />
                                        <AvatarFallback className="text-[8px]">{project.editor.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    {project.editor.name}
                                </span>
                            )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            {project.editor ? (
                                <ProjectChat
                                    projectId={projectId}
                                    currentUser={user}
                                    userProfile={userProfile}
                                    project={project}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
                                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                        <Users className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold">No editor assigned</p>
                                        <p className="text-xs text-muted-foreground mt-1">Assign an editor to start chatting.</p>
                                    </div>
                                    {isCreator && (
                                        <Button size="sm" className="gap-2" onClick={() => setShowAssignModal(true)}>
                                            <UserPlus className="h-3.5 w-3.5" /> Assign Editor
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {commentModalVersion && (
                <VideoCommentModal
                    version={commentModalVersion.version}
                    label={commentModalVersion.label}
                    projectId={projectId}
                    currentUser={user}
                    userProfile={userProfile}
                    isCreator={isCreator}
                    onClose={() => setCommentModalVersion(null)}
                />
            )}

            {showAssignModal && (
                <AssignEditorModal
                    onClose={() => setShowAssignModal(false)}
                    onAssign={async (editorId) => { await assignEditor(projectId, editorId); await loadData(); }}
                    currentEditorId={project.editor_id}
                />
            )}
        </DashboardShell>
    );
}

export default function ProjectPage() {
    return <AuthGuard><ProjectPageContent /></AuthGuard>;
}
