"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AuthGuard from "../components/AuthGuard";
import DashboardShell from "../components/DashboardShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

function ExploreContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const role = searchParams.get("role") || "editor";
    const query = searchParams.get("q") || "";

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState(query);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        let q = supabase
            .from("profiles")
            .select("*")
            .eq("role", role)
            .neq("id", session.user.id)
            .order("created_at", { ascending: false });

        if (query.trim()) q = q.ilike("name", `%${query}%`);

        const { data } = await q;
        setUsers(data || []);
        setLoading(false);
    }, [role, query]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleSearch = (e) => {
        e.preventDefault();
        const params = new URLSearchParams();
        params.set("role", role);
        if (search.trim()) params.set("q", search.trim());
        router.push(`/explore?${params.toString()}`);
    };

    const handleTabChange = (newRole) => {
        const params = new URLSearchParams();
        params.set("role", newRole);
        if (search.trim()) params.set("q", search.trim());
        router.push(`/explore?${params.toString()}`);
    };

    return (
        <DashboardShell>
            <div className="p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Explore Community</h1>
                    <p className="text-muted-foreground text-sm">Find the perfect collaborator for your next project.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <Tabs value={role} onValueChange={handleTabChange}>
                        <TabsList>
                            <TabsTrigger value="editor">Editors</TabsTrigger>
                            <TabsTrigger value="creator">Creators</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name..." className="w-48" />
                        <Button type="submit" variant="outline" size="sm">Search</Button>
                    </form>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Card key={i} className="animate-pulse">
                                <CardContent className="flex flex-col items-center p-6">
                                    <div className="h-16 w-16 rounded-full bg-muted mb-3" />
                                    <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                                    <div className="h-3 bg-muted rounded w-1/3" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : users.length === 0 ? (
                    <Card className="text-center py-12">
                        <CardContent><p className="text-muted-foreground">No users found. Try adjusting your search.</p></CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {users.map((user) => (
                            <Card key={user.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="flex flex-col items-center p-6 text-center">
                                    <Avatar className="h-16 w-16 mb-3">
                                        <AvatarImage src={user.avatar_url} alt={user.name} />
                                        <AvatarFallback className="text-lg">{user.name?.[0] || "?"}</AvatarFallback>
                                    </Avatar>
                                    <p className="font-semibold">{user.name}</p>
                                    <Badge variant="secondary" className="text-xs mt-1 capitalize">{user.role}</Badge>
                                    <p className="text-xs text-muted-foreground mt-1 truncate w-full">{user.email}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </DashboardShell>
    );
}

export default function ExplorePage() {
    return (
        <AuthGuard>
            <Suspense fallback={<DashboardShell><div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-muted border-t-primary"></div></div></DashboardShell>}>
                <ExploreContent />
            </Suspense>
        </AuthGuard>
    );
}
