"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthGuard({ children, requiredRole }) {
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);
    const hasChecked = useRef(false);

    useEffect(() => {
        const checkAuth = async () => {
            if (hasChecked.current) return;
            hasChecked.current = true;

            console.log("[AuthGuard] Checking session");
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session?.user) {
                console.log("[AuthGuard] Session not found");
                router.replace("/login");
                return;
            }

            console.log("[AuthGuard] Session found");

            // STEP 11 — Always fetch role from database (security rule)
            try {
                const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", session.user.id)
                    .maybeSingle();

                if (profileError) {
                    console.error("[ERROR] Profile fetch failed:", profileError);
                    router.replace("/login");
                    return;
                }

                // No profile or no role → onboarding
                if (!profile || !profile.role) {
                    console.log("[AuthGuard] No profile/role, redirecting to onboarding");
                    if (pathname !== "/onboarding") {
                        router.replace("/onboarding");
                    } else {
                        setAuthorized(true);
                    }
                    return;
                }

                // If requiredRole not specified, just need any valid role
                if (!requiredRole) {
                    setAuthorized(true);
                    return;
                }

                // Role mismatch → redirect to correct dashboard
                if (profile.role !== requiredRole) {
                    console.log(`[AuthGuard] Role mismatch: ${profile.role} vs ${requiredRole}`);
                    router.replace(`/${profile.role}/dashboard`);
                    return;
                }

                console.log(`[AuthGuard] Access granted for role: ${requiredRole}`);
                setAuthorized(true);
            } catch (err) {
                console.error("[ERROR] AuthGuard exception:", err);
                router.replace("/login");
            }
        };

        checkAuth();
    }, [router, pathname, requiredRole]);

    if (!authorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-indigo-600"></div>
            </div>
        );
    }

    return <>{children}</>;
}
