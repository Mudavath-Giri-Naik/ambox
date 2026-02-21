"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthGuard({ children, requiredRole }) {
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            console.log(`[AuthGuard] Checking access for ${pathname}...`);
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session?.user) {
                console.warn("[AuthGuard] No session found, redirecting to /login");
                router.push("/login");
                return;
            }

            // If just checking login (no specific role), we are good
            if (!requiredRole) {
                setAuthorized(true);
                return;
            }

            // Check role
            try {
                const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", session.user.id)
                    .single();

                if (profileError || !profile) {
                    console.error("[AuthGuard] Profile error or missing. Redirecting...", profileError);
                    router.push("/onboarding");
                    return;
                }

                if (profile.role !== requiredRole) {
                    console.warn(`[AuthGuard] User role '${profile.role}' does not match required '${requiredRole}'. Redirecting...`);
                    router.push(`/${profile.role}`); // Redirect to their actual dashboard
                    return;
                }

                console.log(`[AuthGuard] Access granted for role: ${requiredRole}`);
                setAuthorized(true);
            } catch (err) {
                console.error("[AuthGuard] Exception checking role:", err);
                router.push("/login");
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
