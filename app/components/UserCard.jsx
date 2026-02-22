"use client";

import React from "react";

export default function UserCard({ user, viewerRole, targetRole }) {
    // Viewer is looking at the people in the list (targetRole).
    // If the Viewer is a "creator" and the target user is an "editor", show extra button.

    const showSelectButton = viewerRole === "creator" && targetRole === "editor";
    const badgeColor =
        targetRole === "creator"
            ? "bg-purple-100 text-purple-800 border-purple-200"
            : "bg-blue-100 text-blue-800 border-blue-200";

    const formattedDate = user.created_at
        ? new Date(user.created_at).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
        })
        : "";

    return (
        <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 overflow-hidden flex flex-col items-center p-6 text-center">
            {/* Avatar */}
            <div className="h-20 w-20 rounded-full bg-gray-200 border-2 border-white shadow-sm mb-4 overflow-hidden flex items-center justify-center">
                {user.avatar_url ? (
                    <img
                        src={user.avatar_url}
                        alt={user.name || "Avatar"}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <span className="text-2xl text-gray-400 capitalize">
                        {user.name ? user.name.charAt(0) : "?"}
                    </span>
                )}
            </div>

            {/* Info */}
            <h3 className="text-lg font-bold text-gray-900 mb-1">{user.name || "Unnamed User"}</h3>

            {/* Role Badge */}
            <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeColor} capitalize mb-2`}
            >
                {targetRole}
            </span>

            {user.email && (
                <p className="text-sm text-gray-500 mb-1 truncate w-full max-w-full px-2" title={user.email}>
                    {user.email}
                </p>
            )}

            {formattedDate && (
                <p className="text-xs text-gray-400 mb-6">Joined {formattedDate}</p>
            )}

            {/* Buttons Output */}
            <div className="mt-auto w-full flex flex-col gap-2">
                <button className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 font-medium py-2 px-4 rounded-lg transition-colors text-sm">
                    View Profile
                </button>

                {showSelectButton && (
                    <button
                        disabled
                        className="w-full bg-gray-100 text-gray-400 cursor-not-allowed font-medium py-2 px-4 rounded-lg text-sm border border-gray-200"
                        title="Coming soon"
                    >
                        Select for Project
                    </button>
                )}
            </div>
        </div>
    );
}
