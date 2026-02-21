"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AuthGuard from "../components/AuthGuard";

function CreatorDashboardContent() {
    const router = useRouter();
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const loadProfile = async () => {
            console.log("[Creator Dashboard] Loading profile...");
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                const { data } = await supabase
                    .from("profiles")
                    .select("name, role, avatar_url")
                    .eq("id", session.user.id)
                    .single();

                if (data) {
                    setProfile(data);
                    console.log("[Creator Dashboard] Profile loaded:", data);
                }
            }
        };
        loadProfile();
    }, []);

    const handleLogout = async () => {
        console.log("[Creator Dashboard] Logging out...");
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-indigo-600 p-8 text-white flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">
                            Welcome, {profile?.name || "Creator"}
                        </h1>
                        <p className="mt-2 text-indigo-100 flex items-center gap-2">
                            <span className="bg-indigo-500 px-3 py-1 rounded-full text-sm font-semibold uppercase tracking-wider">
                                {profile?.role || "Creator"}
                            </span>
                            Dashboard
                        </p>
                    </div>
                    {profile?.avatar_url && (
                        <img
                            src={profile.avatar_url}
                            alt="Avatar"
                            className="w-16 h-16 rounded-full border-2 border-white shadow-sm"
                        />
                    )}
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 text-center">
                            <h3 className="text-lg font-semibold text-indigo-900 mb-2">My Content</h3>
                            <p className="text-4xl font-bold text-indigo-600">12</p>
                        </div>
                        <div className="bg-green-50 p-6 rounded-xl border border-green-100 text-center">
                            <h3 className="text-lg font-semibold text-green-900 mb-2">Total Views</h3>
                            <p className="text-4xl font-bold text-green-600">8.4k</p>
                        </div>
                        <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 text-center">
                            <h3 className="text-lg font-semibold text-purple-900 mb-2">Subscribers</h3>
                            <p className="text-4xl font-bold text-purple-600">245</p>
                        </div>
                    </div>

                    <div className="flex justify-end border-t border-gray-100 mt-8 pt-8">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-6 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-medium rounded-lg transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CreatorPage() {
    return (
        <AuthGuard requiredRole="creator">
            <CreatorDashboardContent />
        </AuthGuard>
    );
}
