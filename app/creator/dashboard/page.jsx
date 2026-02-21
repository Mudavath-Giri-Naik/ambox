"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
    getCurrentUser,
    getUserProfile,
    getCreatorProjects,
    createProject,
    approveProject,
    requestChanges,
} from "@/lib/supabase/helpers";
import AuthGuard from "../../components/AuthGuard";
import DashboardHeader from "../../components/DashboardHeader";
import ProjectCard from "../../components/ProjectCard";
import CreateProjectModal from "../../components/CreateProjectModal";

function CreatorDashboardContent() {
    const router = useRouter();
    const [profile, setProfile] = useState(null);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const loadData = async () => {
        const user = await getCurrentUser();
        if (!user) return;

        const { profile: p } = await getUserProfile(user.id);
        setProfile(p);

        const { projects: list } = await getCreatorProjects(user.id);
        setProjects(list);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreate = async ({ title, description, platform, editorId }) => {
        const user = await getCurrentUser();
        if (!user) throw new Error("Not authenticated");

        const { error } = await createProject({
            title,
            description,
            platform,
            creatorId: user.id,
            editorId,
        });
        if (error) throw error;
        await loadData();
    };

    const handleApprove = async (projectId) => {
        await approveProject(projectId);
        await loadData();
    };

    const handleRequestChanges = async (projectId) => {
        await requestChanges(projectId);
        await loadData();
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace("/login");
    };

    const totalProjects = projects.length;
    const inEdit = projects.filter((p) => p.status === "in_edit").length;
    const awaitingReview = projects.filter((p) => p.status === "review").length;

    return (
        <div className="min-h-screen bg-gray-50">
            <DashboardHeader
                title={`Welcome, ${profile?.name || "Creator"}`}
                subtitle="Creator Dashboard"
                avatarUrl={profile?.avatar_url}
            >
                <button
                    onClick={() => router.push("/explore")}
                    className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors text-sm"
                >
                    Explore Editors
                </button>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                >
                    + New Project
                </button>
                <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors text-sm"
                >
                    Sign Out
                </button>
            </DashboardHeader>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
                        <p className="text-sm text-gray-500 mb-1">Total Projects</p>
                        <p className="text-3xl font-bold text-gray-900">{totalProjects}</p>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-center">
                        <p className="text-sm text-yellow-700 mb-1">In Edit</p>
                        <p className="text-3xl font-bold text-yellow-600">{inEdit}</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                        <p className="text-sm text-red-700 mb-1">Awaiting Review</p>
                        <p className="text-3xl font-bold text-red-600">{awaitingReview}</p>
                    </div>
                </div>

                {/* Project List */}
                {loading ? (
                    <div className="text-center py-12 text-gray-400">Loading projects...</div>
                ) : projects.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-gray-400 text-lg mb-4">No projects yet.</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Create Your First Project
                        </button>
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
                                        <ProjectCard project={project} role="creator" />
                                    </div>
                                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                                        <button
                                            onClick={() => router.push(`/project/${project.id}`)}
                                            className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            Open
                                        </button>
                                        {project.status === "review" && (
                                            <>
                                                <button
                                                    onClick={() => handleApprove(project.id)}
                                                    className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleRequestChanges(project.id)}
                                                    className="px-3 py-1.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                                                >
                                                    Request Changes
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showCreateModal && (
                <CreateProjectModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreate}
                />
            )}
        </div>
    );
}

export default function CreatorDashboardPage() {
    return (
        <AuthGuard requiredRole="creator">
            <CreatorDashboardContent />
        </AuthGuard>
    );
}
