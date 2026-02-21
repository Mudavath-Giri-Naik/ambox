"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
    getCurrentUser,
    getUserProfile,
    getEditorProjects,
    uploadVersion,
    getNextVersionNumber,
} from "@/lib/supabase/helpers";
import AuthGuard from "../../components/AuthGuard";
import DashboardHeader from "../../components/DashboardHeader";
import ProjectCard from "../../components/ProjectCard";

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

    useEffect(() => {
        loadData();
    }, []);

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

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace("/login");
    };

    const totalAssigned = projects.length;
    const activeProjects = projects.filter((p) => ["in_edit", "changes_requested"].includes(p.status)).length;
    const newBriefs = projects.filter((p) => p.status === "briefing").length;

    return (
        <div className="min-h-screen bg-gray-50">
            <DashboardHeader
                title={`Welcome, ${profile?.name || "Editor"}`}
                subtitle="Editor Dashboard"
                avatarUrl={profile?.avatar_url}
            >
                <button
                    onClick={() => router.push("/explore")}
                    className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors text-sm"
                >
                    Explore Creators
                </button>
                <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors text-sm"
                >
                    Sign Out
                </button>
            </DashboardHeader>

            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelected}
                className="hidden"
                accept="video/*"
            />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
                        <p className="text-sm text-gray-500 mb-1">Total Assigned</p>
                        <p className="text-3xl font-bold text-gray-900">{totalAssigned}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center">
                        <p className="text-sm text-blue-700 mb-1">Active Projects</p>
                        <p className="text-3xl font-bold text-blue-600">{activeProjects}</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                        <p className="text-sm text-green-700 mb-1">New Brief Waiting</p>
                        <p className="text-3xl font-bold text-green-600">{newBriefs}</p>
                    </div>
                </div>

                {/* Project List */}
                {loading ? (
                    <div className="text-center py-12 text-gray-400">Loading projects...</div>
                ) : projects.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-gray-400 text-lg">No projects assigned yet.</p>
                        <p className="text-gray-400 text-sm mt-2">Creators will assign projects to you.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {projects.map((project) => (
                            <div key={project.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all">
                                <div className="flex items-start justify-between">
                                    <div
                                        className="flex-1 cursor-pointer"
                                        onClick={() => router.push(`/project/${project.id}`)}
                                    >
                                        <ProjectCard project={project} role="editor" />
                                    </div>
                                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                                        <button
                                            onClick={() => router.push(`/project/${project.id}`)}
                                            className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            Open
                                        </button>
                                        {["in_edit", "changes_requested", "briefing"].includes(project.status) && (
                                            <button
                                                onClick={() => handleUploadClick(project.id)}
                                                disabled={uploadingId === project.id}
                                                className="px-3 py-1.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-50"
                                            >
                                                {uploadingId === project.id ? "Uploading..." : "Upload Version"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function EditorDashboardPage() {
    return (
        <AuthGuard requiredRole="editor">
            <EditorDashboardContent />
        </AuthGuard>
    );
}
