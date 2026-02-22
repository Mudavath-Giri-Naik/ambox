"use client";

import { useRouter } from "next/navigation";
import StatusBadge from "./StatusBadge";

function timeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

export default function ProjectCard({ project, role }) {
    const router = useRouter();

    const collaborator = role === "creator" ? project.editor : project.creator;
    const unread = role === "creator" ? project.unread_creator_count : project.unread_editor_count;

    return (
        <div
            className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
            onClick={() => router.push(`/project/${project.id}`)}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 truncate">{project.title}</h3>
                    <p className="text-sm text-gray-500 capitalize mt-0.5">{project.platform}</p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                    <StatusBadge status={project.status} />
                    {unread > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                            {unread}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                    {collaborator?.avatar_url ? (
                        <img src={collaborator.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                            {collaborator?.name?.[0] || "?"}
                        </div>
                    )}
                    <span className="text-sm text-gray-600">
                        {collaborator?.name || (role === "creator" ? "No editor" : "Creator")}
                    </span>
                </div>
                <span className="text-xs text-gray-400">{timeAgo(project.last_activity_at)}</span>
            </div>
        </div>
    );
}
