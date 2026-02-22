"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function ExploreTabs() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentRole = searchParams.get("role") || "editor";

    const handleTabClick = (role) => {
        const params = new URLSearchParams(searchParams);
        params.set("role", role);
        router.push(`/explore?${params.toString()}`);
    };

    return (
        <div className="flex space-x-4 border-b border-gray-200 mb-8">
            <button
                onClick={() => handleTabClick("editor")}
                className={`pb-4 px-2 text-sm font-medium transition-colors ${currentRole === "editor"
                        ? "border-b-2 border-indigo-600 text-indigo-600"
                        : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
            >
                Explore Editors
            </button>
            <button
                onClick={() => handleTabClick("creator")}
                className={`pb-4 px-2 text-sm font-medium transition-colors ${currentRole === "creator"
                        ? "border-b-2 border-indigo-600 text-indigo-600"
                        : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
            >
                Explore Creators
            </button>
        </div>
    );
}
