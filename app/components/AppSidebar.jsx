"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentUser, getUserProfile } from "@/lib/supabase/helpers";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarRail,
    SidebarMenuBadge,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutDashboard, Search, Bell, Settings, Compass } from "lucide-react";

export function AppSidebar() {
    const router = useRouter();
    const pathname = usePathname();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [totalUnread, setTotalUnread] = useState(0);

    useEffect(() => {
        const load = async () => {
            const user = await getCurrentUser();
            if (!user) return;
            const { profile: p } = await getUserProfile(user.id);
            setProfile(p);

            // Fetch total unread message count
            if (p?.role) {
                const field = p.role === "creator" ? "unread_creator_messages" : "unread_editor_messages";
                const { data: projects } = await supabase
                    .from("projects")
                    .select(`id, ${field}`)
                    .or(`creator_id.eq.${user.id},editor_id.eq.${user.id}`);

                const total = (projects || []).reduce((sum, proj) => sum + (proj[field] || 0), 0);
                setTotalUnread(total);
            }

            setLoading(false);
        };
        load();
    }, []);

    const isCreator = profile?.role === "creator";
    const dashboardPath = isCreator ? "/creator/dashboard" : "/editor/dashboard";

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace("/login");
    };

    const navItems = isCreator
        ? [
            { title: "Dashboard", path: "/creator/dashboard", icon: LayoutDashboard },
            { title: "Explore Editors", path: "/explore?role=editor", icon: Compass },
        ]
        : [
            { title: "Dashboard", path: "/editor/dashboard", icon: LayoutDashboard },
            { title: "Explore Creators", path: "/explore?role=creator", icon: Compass },
        ];

    const extraNavItems = [
        { title: "Notifications", path: "/notifications", icon: Bell, badge: totalUnread },
        { title: "Search", path: "/search", icon: Search },
        { title: "Settings", path: "/settings", icon: Settings },
    ];

    if (loading) return null;

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            onClick={() => router.push("/")}
                            className="cursor-pointer"
                        >
                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                                A
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">Ambox</span>
                                <span className="truncate text-xs text-muted-foreground capitalize">
                                    {profile?.role} workspace
                                </span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        isActive={pathname === item.path || pathname.startsWith(item.path.split("?")[0])}
                                        onClick={() => router.push(item.path)}
                                        className="cursor-pointer"
                                    >
                                        <span><item.icon className="h-4 w-4" /></span>
                                        <span>{item.title}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>Tools</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {extraNavItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        isActive={pathname === item.path}
                                        onClick={() => router.push(item.path)}
                                        className="cursor-pointer"
                                    >
                                        <span><item.icon className="h-4 w-4" /></span>
                                        <span>{item.title}</span>
                                    </SidebarMenuButton>
                                    {item.badge > 0 && (
                                        <SidebarMenuBadge className="bg-destructive text-destructive-foreground rounded-full text-[10px] px-1.5">
                                            {item.badge}
                                        </SidebarMenuBadge>
                                    )}
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="cursor-pointer"
                                >
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarImage src={profile?.avatar_url} alt={profile?.name} />
                                        <AvatarFallback className="rounded-lg">{profile?.name?.[0] || "U"}</AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">{profile?.name}</span>
                                        <span className="truncate text-xs text-muted-foreground">{profile?.email}</span>
                                    </div>
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                                side="top"
                                align="start"
                                sideOffset={4}
                            >
                                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarImage src={profile?.avatar_url} alt={profile?.name} />
                                        <AvatarFallback className="rounded-lg">{profile?.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">{profile?.name}</span>
                                        <span className="truncate text-xs text-muted-foreground">{profile?.email}</span>
                                    </div>
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer">
                                    <Settings className="h-4 w-4 mr-2" /> Settings
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                                    Sign Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
