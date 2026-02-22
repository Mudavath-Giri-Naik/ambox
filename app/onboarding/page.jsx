"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Palette, Scissors } from "lucide-react";

export default function OnboardingPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) { router.replace("/login"); return; }

            const currentUser = session.user;
            const { data: existingProfile } = await supabase
                .from("profiles").select("role").eq("id", currentUser.id).maybeSingle();

            if (existingProfile?.role) {
                router.replace(existingProfile.role === "creator" ? "/creator/dashboard" : "/editor/dashboard");
                return;
            }
            setUser(currentUser);
            if (currentUser.user_metadata?.full_name) setName(currentUser.user_metadata.full_name);
            setLoading(false);
        };
        fetchUser();
    }, [router]);

    const handleCreateProfile = async (role) => {
        if (!name.trim()) { setError("Please enter your name."); return; }
        setError("");
        setSaving(true);
        try {
            const { error: insertError } = await supabase.from("profiles").insert([{
                id: user.id, email: user.email, name: name.trim(),
                avatar_url: user.user_metadata?.avatar_url || null, role,
            }]);
            if (insertError) throw insertError;
            console.log("[Onboarding] Profile created successfully");
            router.replace(role === "creator" ? "/creator/dashboard" : "/editor/dashboard");
        } catch (err) {
            setError("Failed to create profile. Please try again.");
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-muted border-t-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
                    <CardDescription>Choose how you will use Ambox</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">{error}</div>}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Your Name</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            disabled={saving}
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-sm font-medium">I am a...</label>
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                className="h-auto p-4 flex flex-col items-center gap-2"
                                onClick={() => handleCreateProfile("creator")}
                                disabled={saving}
                            >
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mb-1 text-primary"><Palette className="h-4 w-4" /></div>
                                <span className="font-semibold">Creator</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-auto p-4 flex flex-col items-center gap-2"
                                onClick={() => handleCreateProfile("editor")}
                                disabled={saving}
                            >
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mb-1 text-primary"><Scissors className="h-4 w-4" /></div>
                                <span className="font-semibold">Editor</span>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
