"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AuthGuard from "../../components/AuthGuard";

function EditorDashboardContent() {
    const router = useRouter();
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const loadProfile = async () => {
            console.log("[Dashboard] Loading editor profile...");
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                const { data } = await supabase
                    .from("profiles")
                    .select("name, role, avatar_url")
                    .eq("id", session.user.id)
                    .maybeSingle();

                if (data) {
                    setProfile(data);
                    console.log("[Dashboard] Profile loaded:", data);
                }
            }
        };
        loadProfile();
    }, []);

    const handleLogout = async () => {
        console.log("[Dashboard] Logging out...");
        await supabase.auth.signOut();
        router.replace("/login");
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-blue-600 p-8 text-white flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">
                            Welcome, {profile?.name || "Editor"}
                        </h1>
                        <p className="mt-2 text-blue-100 flex items-center gap-2">
                            <span className="bg-blue-500 px-3 py-1 rounded-full text-sm font-semibold uppercase tracking-wider">
                                {profile?.role || "Editor"}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 flex flex-col items-center text-center">
                            <div className="text-4xl mb-3">📝</div>
                            <h3 className="text-lg font-semibold text-blue-900 mb-2">Pending Edits</h3>
                            <p className="text-3xl font-bold text-blue-600">5</p>
                        </div>
                        <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-100 flex flex-col items-center text-center">
                            <div className="text-4xl mb-3">✨</div>
                            <h3 className="text-lg font-semibold text-yellow-900 mb-2">Completed Tasks</h3>
                            <p className="text-3xl font-bold text-yellow-600">34</p>
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

export default function EditorDashboardPage() {
    return (
        <AuthGuard requiredRole="editor">
            <EditorDashboardContent />
        </AuthGuard>
    );
}
