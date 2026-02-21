import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function middleware(request) {
    let supabaseResponse = NextResponse.next();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const isProtectedRoute =
        request.nextUrl.pathname.startsWith("/creator") ||
        request.nextUrl.pathname.startsWith("/editor") ||
        request.nextUrl.pathname.startsWith("/onboarding") ||
        request.nextUrl.pathname.startsWith("/explore");

    if (isProtectedRoute && !user) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login";
        return NextResponse.redirect(loginUrl);
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public (public files)
         * - auth/callback (must remain unprotected for OAuth code exchange)
         */
        '/((?!_next/static|_next/image|favicon.ico|public/|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
