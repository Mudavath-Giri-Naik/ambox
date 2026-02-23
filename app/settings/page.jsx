"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentUser, getUserProfile } from "@/lib/supabase/helpers";
import AuthGuard from "../components/AuthGuard";
import DashboardShell from "../components/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Settings, CheckCircle, XCircle } from "lucide-react";

function SettingsContent() {
    const [userId, setUserId] = useState(null);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [role, setRole] = useState("");
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: string }
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const load = async () => {
            const user = await getCurrentUser();
            if (!user) return;
            setUserId(user.id);
            const { profile } = await getUserProfile(user.id);
            if (profile) {
                setName(profile.name || "");
                setEmail(profile.email || "");
                setAvatarUrl(profile.avatar_url || "");
                setRole(profile.role || "");
            }
            setLoading(false);
        };
        load();
    }, []);

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !userId) return;
        setUploadingAvatar(true);
        setMessage(null);

        const ext = file.name.split(".").pop();
        const filePath = `${userId}/avatar.${ext}`;

        // Upload to storage (upsert to replace existing)
        const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, file, { upsert: true });

        if (uploadError) {
            setMessage({ type: "error", text: "Avatar upload failed: " + uploadError.message });
            setUploadingAvatar(false);
            return;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);

        const publicUrl = urlData?.publicUrl;
        if (publicUrl) {
            // Update profile
            const { error } = await supabase
                .from("profiles")
                .update({ avatar_url: publicUrl })
                .eq("id", userId);

            if (error) {
                setMessage({ type: "error", text: "Failed to save avatar URL." });
            } else {
                setAvatarUrl(publicUrl + "?t=" + Date.now()); // bust cache
                setMessage({ type: "success", text: "Avatar updated!" });
            }
        }

        setUploadingAvatar(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const handleSave = async () => {
        setMessage(null);

        if (!name.trim()) {
            setMessage({ type: "error", text: "Name is required." });
            return;
        }
        if (!validateEmail(email)) {
            setMessage({ type: "error", text: "Please enter a valid email address." });
            return;
        }

        setSaving(true);

        const { error } = await supabase
            .from("profiles")
            .update({
                name: name.trim(),
                email: email.trim(),
            })
            .eq("id", userId);

        if (error) {
            setMessage({ type: "error", text: "Failed to save: " + error.message });
        } else {
            setMessage({ type: "success", text: "Profile updated successfully!" });
        }

        setSaving(false);
    };

    if (loading) {
        return (
            <DashboardShell>
                <div className="flex items-center justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-muted border-t-primary"></div>
                </div>
            </DashboardShell>
        );
    }

    return (
        <DashboardShell>
            <div className="p-3 sm:p-6 space-y-6 max-w-2xl">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Settings className="h-6 w-6 text-foreground" /> Settings</h1>
                    <p className="text-muted-foreground text-sm">Manage your profile and account settings.</p>
                </div>

                {/* Avatar Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Profile Photo</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                        <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                        <Avatar className="h-20 w-20 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <AvatarImage src={avatarUrl} />
                            <AvatarFallback className="text-xl">{name?.[0] || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}>
                                {uploadingAvatar ? "Uploading..." : "Change Photo"}
                            </Button>
                            <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Click the avatar or button to upload.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Profile Fields */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Profile Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name</label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your name"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Role</label>
                            <div>
                                <Badge
                                    className={`text-xs ${role === "creator"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                        : "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                                        }`}
                                >
                                    {role.charAt(0).toUpperCase() + role.slice(1)}
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">Role is set at signup and cannot be changed.</p>
                            </div>
                        </div>

                        <Separator />

                        {/* Status message */}
                        {message && (
                            <div className={`text-sm px-3 py-2 rounded-md ${message.type === "success"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                }`}>
                                <span className="mr-1.5 inline-flex items-center gap-1 mt-0.5 align-top">
                                    {message.type === "success" ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                </span>
                                {message.text}
                            </div>
                        )}

                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </DashboardShell>
    );
}

export default function SettingsPage() {
    return <AuthGuard><SettingsContent /></AuthGuard>;
}
