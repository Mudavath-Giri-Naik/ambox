"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SearchInput() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get("q") || "";

    const [searchTerm, setSearchTerm] = useState(initialQuery);

    useEffect(() => {
        // Debounce the search input by 500ms
        const handler = setTimeout(() => {
            const params = new URLSearchParams(searchParams);
            if (searchTerm) {
                params.set("q", searchTerm);
            } else {
                params.delete("q");
            }

            // Keep other params like `role` intact while navigating
            router.push(`/explore?${params.toString()}`);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm, router, searchParams]);

    return (
        <div className="relative w-full max-w-md mb-8">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                    className="h-5 w-5 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                >
                    <path
                        fillRule="evenodd"
                        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                        clipRule="evenodd"
                    />
                </svg>
            </div>
            <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors shadow-sm"
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
    );
}
