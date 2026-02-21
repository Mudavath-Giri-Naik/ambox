"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    getCurrentUser,
    getUserProfile,
    getProjectById,
    getProjectVersions,
    getNextVersionNumber,
    uploadVersion,
    assignEditor,
    approveProject,
    completeProject,
    requestChanges,
    resetUnreadCount,
} from "@/lib/supabase/helpers";
import AuthGuard from "../../components/AuthGuard";
import StatusBadge from "../../components/StatusBadge";
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
    const [activeTab, setActiveTab] = useState("versions");
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

        // Reset unread count when viewing project
        if (profile?.role) {
            await resetUnreadCount(projectId, profile.role);
        }
    };

    useEffect(() => {
        loadData();
    }, [projectId]);

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setUploading(true);
        const nextVersion = await getNextVersionNumber(projectId);
        const { error } = await uploadVersion(projectId, user.id, file, nextVersion);
        if (error) console.error("[Project] Upload failed:", error.message);
        await loadData();
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleAssign = async (editorId) => {
        const { error } = await assignEditor(projectId, editorId);
        if (error) throw error;
        await loadData();
    };

    const handleApprove = async () => {
        await approveProject(projectId);
        await loadData();
    };

    const handleComplete = async () => {
        await completeProject(projectId);
        await loadData();
    };

    const handleRequestChanges = async () => {
        await requestChanges(projectId);
        await loadData();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-indigo-600"></div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">Project not found.</p>
            </div>
        );
    }

    const isCreator = userProfile?.role === "creator";
    const isEditor = userProfile?.role === "editor";

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <button
                        onClick={() => router.back()}
                        className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center gap-1"
                    >
                        ← Back to Dashboard
                    </button>
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
                            <div className="flex items-center gap-3 mt-2">
                                <StatusBadge status={project.status} />
                                <span className="text-sm text-gray-500 capitalize">{project.platform}</span>
                            </div>
                            {project.description && (
                                <p className="text-sm text-gray-600 mt-2">{project.description}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {isCreator && (
                                <button
                                    onClick={() => setShowAssignModal(true)}
                                    className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                                >
                                    {project.editor ? "Reassign Editor" : "Assign Editor"}
                                </button>
                            )}
                            {isCreator && project.status === "review" && (
                                <>
                                    <button
                                        onClick={handleApprove}
                                        className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors text-sm"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={handleRequestChanges}
                                        className="px-4 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors text-sm"
                                    >
                                        Request Changes
                                    </button>
                                </>
                            )}
                            {isCreator && project.status === "approved" && (
                                <button
                                    onClick={handleComplete}
                                    className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                                >
                                    Mark Completed
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Collaborators */}
                    <div className="flex gap-6 mt-4 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500">Creator:</span>
                            {project.creator?.avatar_url && (
                                <img src={project.creator.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                            )}
                            <span className="font-medium text-gray-700">{project.creator?.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500">Editor:</span>
                            {project.editor ? (
                                <>
                                    {project.editor.avatar_url && (
                                        <img src={project.editor.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                                    )}
                                    <span className="font-medium text-gray-700">{project.editor.name}</span>
                                </>
                            ) : (
                                <span className="text-gray-400 italic">Not assigned</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-6">
                        {["versions", "upload", "details"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-3 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab
                                        ? "border-indigo-600 text-indigo-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === "versions" && (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Version Timeline</h2>
                        {versions.length === 0 ? (
                            <p className="text-gray-400 text-center py-8">No versions uploaded yet.</p>
                        ) : (
                            <div className="space-y-4">
                                {versions.map((v) => (
                                    <div key={v.id} className="bg-white border border-gray-200 rounded-xl p-5">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                                                    v{v.version_number}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        Version {v.version_number}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(v.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <a
                                                href={v.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
                                            >
                                                Download
                                            </a>
                                        </div>
                                        {/* Video Preview */}
                                        <div className="mt-3 rounded-lg overflow-hidden bg-black">
                                            <video
                                                controls
                                                src={v.file_url}
                                                className="w-full max-h-80 object-contain"
                                                preload="metadata"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "upload" && (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Version</h2>
                        {isEditor ? (
                            <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleUpload}
                                    className="hidden"
                                    accept="video/*"
                                    disabled={uploading}
                                />
                                <div className="text-4xl mb-3">📁</div>
                                <p className="text-gray-600 mb-4">
                                    {uploading ? "Uploading and processing..." : "Upload a new version of the project"}
                                </p>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                >
                                    {uploading ? "Uploading..." : "Choose File"}
                                </button>
                                <p className="text-xs text-gray-400 mt-3">
                                    This will be Version v{versions.length > 0 ? versions[0].version_number + 1 : 0}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Status will automatically change to &quot;Review&quot; after upload.
                                </p>
                            </div>
                        ) : (
                            <p className="text-gray-400 text-center py-8">Only editors can upload versions.</p>
                        )}
                    </div>
                )}

                {activeTab === "details" && (
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h2>
                        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500">Title</p>
                                    <p className="font-medium text-gray-900">{project.title}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Platform</p>
                                    <p className="font-medium text-gray-900 capitalize">{project.platform}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Status</p>
                                    <StatusBadge status={project.status} />
                                </div>
                                <div>
                                    <p className="text-gray-500">Versions</p>
                                    <p className="font-medium text-gray-900">{versions.length}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Created</p>
                                    <p className="font-medium text-gray-900">
                                        {new Date(project.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Last Activity</p>
                                    <p className="font-medium text-gray-900">
                                        {new Date(project.last_activity_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            {project.description && (
                                <div className="pt-4 border-t border-gray-100">
                                    <p className="text-gray-500 text-sm mb-1">Description</p>
                                    <p className="text-sm text-gray-700">{project.description}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {showAssignModal && (
                <AssignEditorModal
                    onClose={() => setShowAssignModal(false)}
                    onAssign={handleAssign}
                    currentEditorId={project.editor_id}
                />
            )}
        </div>
    );
}

export default function ProjectPage() {
    return (
        <AuthGuard>
            <ProjectPageContent />
        </AuthGuard>
    );
}
