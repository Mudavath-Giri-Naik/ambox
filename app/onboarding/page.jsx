"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function OnboardingPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchUser = async () => {
            console.log("[Onboarding] Fetching current session user...");
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                console.warn("[Onboarding] No user segment found, redirecting to login");
                router.push("/login");
                return;
            }

            console.log("[Onboarding] User fetched:", session.user.id);
            setUser(session.user);

            // Pre-fill name if available from Google
            if (session.user.user_metadata?.full_name) {
                setName(session.user.user_metadata.full_name);
            }

            setLoading(false);
        };

        fetchUser();
    }, [router]);

    const handleCreateProfile = async (role) => {
        if (!name.trim()) {
            setError("Please enter your name.");
            return;
        }
        setError("");
        setSaving(true);
        console.log(`[Onboarding] Creating profile for ${user.id} as a ${role}...`);

        try {
            const { error: insertError } = await supabase.from("profiles").insert([
                {
                    id: user.id,
                    email: user.email,
                    name: name.trim(),
                    avatar_url: user.user_metadata?.avatar_url || null,
                    role: role,
                },
            ]);

            if (insertError) {
                console.error("[Onboarding] Insert Error:", insertError);
                throw insertError;
            }

            console.log("[Onboarding] Profile created successfully. Redirecting...", role);
            if (role === "creator") {
                router.push("/creator");
            } else {
                router.push("/editor");
            }
        } catch (err) {
            console.error("[Onboarding] Exception:", err);
            setError("Failed to create profile. Please try again.");
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-pulse text-gray-500">Loading your info...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
                <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
                    Complete Your Profile
                </h1>
                <p className="text-center text-gray-500 mb-8">
                    Welcome! Just a few more details to get started.
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                            Your Name
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="John Doe"
                            disabled={saving}
                        />
                    </div>

                    <div className="pt-4">
                        <p className="block text-sm font-medium text-gray-700 mb-3">
                            How will you use Ambox?
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handleCreateProfile("creator")}
                                disabled={saving}
                                className="flex flex-col items-center justify-center border-2 border-indigo-100 hover:border-indigo-500 hover:bg-indigo-50 rounded-xl p-4 transition-colors disabled:opacity-50"
                            >
                                <div className="text-2xl mb-2">🎨</div>
                                <span className="font-semibold text-gray-800">I am Creator</span>
                            </button>

                            <button
                                onClick={() => handleCreateProfile("editor")}
                                disabled={saving}
                                className="flex flex-col items-center justify-center border-2 border-blue-100 hover:border-blue-500 hover:bg-blue-50 rounded-xl p-4 transition-colors disabled:opacity-50"
                            >
                                <div className="text-2xl mb-2">✂️</div>
                                <span className="font-semibold text-gray-800">I am Editor</span>
                            </button>
                        </div>
                    </div>
                </div>

                {saving && (
                    <div className="mt-6 text-center text-sm text-indigo-600 font-medium">
                        Saving profile details...
                    </div>
                )}
            </div>
        </div>
    );
}
