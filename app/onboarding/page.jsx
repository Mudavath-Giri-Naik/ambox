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
                console.warn("[Onboarding] No session, redirecting to login");
                router.replace("/login");
                return;
            }

            const currentUser = session.user;
            console.log("[Onboarding] User fetched:", currentUser.id);

            // Check if profile already exists (returning user shouldn't be here)
            const { data: existingProfile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", currentUser.id)
                .maybeSingle();

            if (existingProfile?.role) {
                console.log("[Onboarding] Profile already exists with role:", existingProfile.role);
                if (existingProfile.role === "creator") {
                    router.replace("/creator/dashboard");
                } else {
                    router.replace("/editor/dashboard");
                }
                return;
            }

            setUser(currentUser);

            // Prefill from Google metadata (STEP 4)
            if (currentUser.user_metadata?.full_name) {
                setName(currentUser.user_metadata.full_name);
            }

            setLoading(false);
        };

        fetchUser();
    }, [router]);

    // STEP 5 — Profile INSERT (only here)
    const handleCreateProfile = async (role) => {
        if (!name.trim()) {
            setError("Please enter your name.");
            return;
        }
        setError("");
        setSaving(true);

        console.log("[Onboarding] Creating profile...");

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
                console.error("[Onboarding ERROR] Insert failed:", insertError.message);
                throw insertError;
            }

            console.log("[Onboarding] Profile created successfully");

            // STEP 6 — Redirect after insert
            if (role === "creator") {
                console.log("[Onboarding] Redirecting to dashboard");
                router.replace("/creator/dashboard");
            } else {
                console.log("[Onboarding] Redirecting to dashboard");
                router.replace("/editor/dashboard");
            }
        } catch (err) {
            console.error("[Onboarding ERROR] Exception:", err);
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
