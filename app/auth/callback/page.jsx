"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState("Authenticating...");

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                console.log("[Callback] Checking session...");
                setStatus("Verifying login session...");

                const {
                    data: { session },
                    error: sessionError,
                } = await supabase.auth.getSession();

                if (sessionError) throw sessionError;

                if (!session?.user) {
                    console.warn("[Callback] No active session found, redirecting to /login");
                    router.push("/login");
                    return;
                }

                const user = session.user;
                console.log("[Callback] User authenticated:", user.id);
                setStatus("Fetching user profile...");

                // Query profiles table
                const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .single();

                if (profileError) {
                    if (profileError.code === "PGRST116") {
                        // Profile does not exist (Row not found)
                        console.log("[Callback] Profile not found. Redirecting to onboarding.");
                        router.push("/onboarding");
                        return;
                    }
                    console.error("[Callback] Error fetching profile:", profileError);
                    throw profileError;
                }

                console.log("[Callback] Found profile:", profile);
                setStatus("Redirecting to dashboard...");

                // Redirect based on role
                if (profile.role === "creator") {
                    router.push("/creator");
                } else if (profile.role === "editor") {
                    router.push("/editor");
                } else {
                    // Fallback if role is somehow invalid
                    console.warn("[Callback] Invalid or missing role, going to onboarding");
                    router.push("/onboarding");
                }
            } catch (error) {
                console.error("[Callback] Exception during callback processing:", error);
                setStatus("An error occurred during authentication.");
            }
        };

        handleAuthCallback();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-indigo-600 mb-4"></div>
                <h2 className="text-xl font-semibold text-gray-700">{status}</h2>
                <p className="text-gray-500 mt-2">Please wait while we log you in...</p>
            </div>
        </div>
    );
}
