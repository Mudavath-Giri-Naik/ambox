import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function GET(request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");

    console.log("[Callback] GET /auth/callback hit");

    if (!code) {
        console.error("[Callback ERROR] No code in URL");
        return NextResponse.redirect(`${origin}/login`);
    }

    console.log("[Callback] Code detected");
    console.log("[Callback] Exchanging code for session");

    // We need to collect cookies set during the exchange so we can
    // forward them onto the final redirect response.
    const cookiesToForward = [];

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    // Collect cookies — we'll apply them to the redirect later
                    cookiesToSet.forEach((cookie) => {
                        cookiesToForward.push(cookie);
                    });
                },
            },
        }
    );

    // Exchange the code for a session (reads PKCE verifier from cookies)
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
        console.error("[Callback ERROR] Code exchange failed:", exchangeError.message);
        return NextResponse.redirect(`${origin}/login`);
    }

    console.log("[Callback] Session success");

    // Get the authenticated user
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        console.error("[Callback ERROR] User fetch failed:", userError?.message);
        return NextResponse.redirect(`${origin}/login`);
    }

    console.log("[Callback] User ID:", user.id);
    console.log("[Callback] Checking profile...");

    // Check profile — NO INSERT here
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
        console.error("[Callback ERROR] Profile fetch failed:", profileError.message);
    }

    // Decide redirect destination
    let redirectTo = `${origin}/onboarding`;

    if (profile?.role === "creator") {
        console.log("[Callback] Profile found, Role: creator");
        redirectTo = `${origin}/creator/dashboard`;
    } else if (profile?.role === "editor") {
        console.log("[Callback] Profile found, Role: editor");
        redirectTo = `${origin}/editor/dashboard`;
    } else if (!profile) {
        console.log("[Callback] Profile not found → onboarding");
    } else {
        console.log("[Callback] Profile found but no role → onboarding");
    }

    // Create redirect and FORWARD all session cookies onto it
    const response = NextResponse.redirect(redirectTo);
    cookiesToForward.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
    });

    console.log("[Callback] Redirecting to:", redirectTo);
    return response;
}
