"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AuthGuard from "../components/AuthGuard";
import ExploreTabs from "../components/ExploreTabs";
import SearchInput from "../components/SearchInput";
import UserCard from "../components/UserCard";

function ExploreContent() {
    const searchParams = useSearchParams();
    const role = searchParams.get("role") || "editor";
    const query = searchParams.get("q") || "";

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [viewerRole, setViewerRole] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);

    const PAGE_SIZE = 12;

    // 1. Fetch Viewer Role First
    useEffect(() => {
        const fetchViewerRole = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", session.user.id)
                    .maybeSingle();
                if (profile) {
                    setViewerRole(profile.role);
                }
            }
        };
        fetchViewerRole();
    }, []);

    // 2. Fetch Users Data based on role/query/page
    const fetchUsers = useCallback(async (isLoadMore = false, currentPage = 0) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return; // Should be handled by AuthGuard

        const currentUserId = session.user.id;

        if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
            setPage(0); // Reset page on new search/role
        }

        try {
            let queryBuilder = supabase
                .from("profiles")
                .select("*", { count: "exact" }) // Need count for pagination limits optionally
                .eq("role", role)
                .neq("id", currentUserId) // Exclude self
                .order("created_at", { ascending: false }); // Sort newest first

            // Apply Search Filter
            if (query.trim() !== "") {
                queryBuilder = queryBuilder.ilike("name", `%${query}%`);
            }

            // Pagination
            const from = currentPage * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;
            queryBuilder = queryBuilder.range(from, to);

            const { data, error } = await queryBuilder;

            if (error) throw error;

            if (isLoadMore) {
                setUsers((prev) => [...prev, ...data]);
            } else {
                setUsers(data || []);
            }

            // Check if we hit the end of the list
            setHasMore(data.length === PAGE_SIZE);

        } catch (err) {
            console.error("[Explore] Error fetching users:", err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [role, query]);

    // Refetch when Role or Query changes
    useEffect(() => {
        fetchUsers(false, 0);
    }, [fetchUsers]);

    const loadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchUsers(true, nextPage);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12">
            <div className="max-w-7xl mx-auto">
                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Explore Community</h1>
                    <p className="text-gray-500">Find the perfect creator or editor for your next project.</p>
                </div>

                {/* Filters and Search - Client side components */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                    <ExploreTabs />
                    <SearchInput />
                </div>

                {/* Content Area */}
                {loading ? (
                    // Skeleton Loading Grid
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center animate-pulse">
                                <div className="h-20 w-20 rounded-full bg-gray-200 mb-4" />
                                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
                                <div className="h-3 bg-gray-200 rounded w-1/4 mb-4" />
                                <div className="h-3 bg-gray-200 rounded w-3/4 mb-6" />
                                <div className="h-10 bg-gray-200 rounded w-full mt-auto" />
                            </div>
                        ))}
                    </div>
                ) : users.length === 0 ? (
                    // Empty State
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500 mt-8">
                        <p className="text-xl font-medium text-gray-900 mb-2">No users found</p>
                        <p>Try adjusting your search or switching roles.</p>
                    </div>
                ) : (
                    // Value State
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {users.map((user) => (
                                <UserCard
                                    key={user.id}
                                    user={user}
                                    viewerRole={viewerRole}
                                    targetRole={role}
                                />
                            ))}
                        </div>

                        {hasMore && (
                            <div className="mt-12 text-center">
                                <button
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                    className="px-6 py-3 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {loadingMore ? "Loading more..." : "Load More Users"}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// Wrap in Suspense because we rely on useSearchParams which reads client-side routing params
export default function ExplorePage() {
    return (
        <AuthGuard>
            <Suspense fallback={
                <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-indigo-600"></div>
                </div>
            }>
                <ExploreContent />
            </Suspense>
        </AuthGuard>
    );
}
