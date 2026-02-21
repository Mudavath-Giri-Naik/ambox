import { supabase } from "@/lib/supabaseClient";

// ─── Session ────────────────────────────────────────────
export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user || null;
}

export async function getUserProfile(userId) {
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
    if (error) console.error("[Helpers] getUserProfile error:", error.message);
    return { profile: data, error };
}

// ─── Users / Explore ────────────────────────────────────
export async function getUsers(currentUserId, role) {
    let query = supabase
        .from("profiles")
        .select("*")
        .neq("id", currentUserId);

    if (role) {
        query = query.eq("role", role);
    }

    const { data, error } = await query.order("name");
    if (error) console.error("[Helpers] getUsers error:", error.message);
    return { users: data || [], error };
}

export async function getEditorsList() {
    const { data, error } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, email")
        .eq("role", "editor")
        .order("name");
    if (error) console.error("[Helpers] getEditorsList error:", error.message);
    return { editors: data || [], error };
}

// ─── Projects ───────────────────────────────────────────
export async function getCreatorProjects(creatorId) {
    const { data, error } = await supabase
        .from("projects")
        .select(`
            *,
            editor:profiles!fk_editor(id, name, avatar_url)
        `)
        .eq("creator_id", creatorId)
        .order("last_activity_at", { ascending: false });
    if (error) console.error("[Helpers] getCreatorProjects error:", error.message);
    return { projects: data || [], error };
}

export async function getEditorProjects(editorId) {
    const { data, error } = await supabase
        .from("projects")
        .select(`
            *,
            creator:profiles!fk_creator(id, name, avatar_url)
        `)
        .eq("editor_id", editorId)
        .order("last_activity_at", { ascending: false });
    if (error) console.error("[Helpers] getEditorProjects error:", error.message);
    return { projects: data || [], error };
}

export async function getProjectById(projectId) {
    const { data, error } = await supabase
        .from("projects")
        .select(`
            *,
            creator:profiles!fk_creator(id, name, avatar_url, email),
            editor:profiles!fk_editor(id, name, avatar_url, email)
        `)
        .eq("id", projectId)
        .maybeSingle();
    if (error) console.error("[Helpers] getProjectById error:", error.message);
    return { project: data, error };
}

export async function createProject({ title, description, platform, creatorId, editorId }) {
    const insertData = {
        title,
        description: description || null,
        platform,
        creator_id: creatorId,
    };

    // If editor assigned at creation, set status to in_edit
    if (editorId) {
        insertData.editor_id = editorId;
        insertData.status = "in_edit";
    }

    const { data, error } = await supabase
        .from("projects")
        .insert([insertData])
        .select()
        .single();
    if (error) console.error("[Helpers] createProject error:", error.message);
    return { project: data, error };
}

export async function assignEditor(projectId, editorId) {
    const { data, error } = await supabase
        .from("projects")
        .update({
            editor_id: editorId,
            status: "in_edit",
            updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .select()
        .single();
    if (error) console.error("[Helpers] assignEditor error:", error.message);
    return { project: data, error };
}

// ─── Creator Review Actions ─────────────────────────────
export async function approveProject(projectId) {
    const { data, error } = await supabase
        .from("projects")
        .update({
            status: "approved",
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .select()
        .single();
    if (error) console.error("[Helpers] approveProject error:", error.message);
    return { project: data, error };
}

export async function completeProject(projectId) {
    const { data, error } = await supabase
        .from("projects")
        .update({
            status: "completed",
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .select()
        .single();
    if (error) console.error("[Helpers] completeProject error:", error.message);
    return { project: data, error };
}

export async function requestChanges(projectId) {
    const { data, error } = await supabase
        .from("projects")
        .update({
            status: "changes_requested",
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            unread_editor_count: supabase.rpc ? 0 : 0, // handled below
        })
        .eq("id", projectId)
        .select()
        .single();

    // Increment unread_editor_count
    if (!error) {
        await supabase.rpc("increment_unread_editor", { project_id_input: projectId }).catch(() => {
            // Fallback: direct update if RPC doesn't exist
            supabase
                .from("projects")
                .update({ unread_editor_count: (data?.unread_editor_count || 0) + 1 })
                .eq("id", projectId);
        });
    }

    if (error) console.error("[Helpers] requestChanges error:", error.message);
    return { project: data, error };
}

// ─── Unread Counters ────────────────────────────────────
export async function resetUnreadCount(projectId, role) {
    const field = role === "creator" ? "unread_creator_count" : "unread_editor_count";
    const { error } = await supabase
        .from("projects")
        .update({ [field]: 0 })
        .eq("id", projectId);
    if (error) console.error("[Helpers] resetUnreadCount error:", error.message);
}

// ─── Versions ───────────────────────────────────────────
export async function getProjectVersions(projectId) {
    const { data, error } = await supabase
        .from("project_versions")
        .select("*")
        .eq("project_id", projectId)
        .order("version_number", { ascending: false });
    if (error) console.error("[Helpers] getProjectVersions error:", error.message);
    return { versions: data || [], error };
}

export async function getNextVersionNumber(projectId) {
    const { data, error } = await supabase
        .from("project_versions")
        .select("version_number")
        .eq("project_id", projectId)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error("[Helpers] getNextVersionNumber error:", error.message);
        return 0;
    }
    return data ? data.version_number + 1 : 0;
}

export async function uploadVersion(projectId, userId, file, versionNumber) {
    // Path: projects/{projectId}/v{versionNumber}/{filename}
    const filePath = `projects/${projectId}/v${versionNumber}/${file.name}`;

    // 1. Upload to Supabase Storage (bucket: project-files)
    const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(filePath, file);

    if (uploadError) {
        console.error("[Helpers] Upload error:", uploadError.message);
        return { version: null, error: uploadError };
    }

    // 2. Get signed URL (private bucket)
    const { data: urlData } = await supabase.storage
        .from("project-files")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

    const fileUrl = urlData?.signedUrl || filePath;

    // 3. Insert version row
    const { data, error: insertError } = await supabase
        .from("project_versions")
        .insert([{
            project_id: projectId,
            uploaded_by: userId,
            version_number: versionNumber,
            file_url: fileUrl,
        }])
        .select()
        .single();

    if (insertError) {
        console.error("[Helpers] Version insert error:", insertError.message);
        return { version: null, error: insertError };
    }

    // 4. Update project: status → review, increment unread_creator_count
    const { data: currentProject } = await supabase
        .from("projects")
        .select("unread_creator_count")
        .eq("id", projectId)
        .single();

    await supabase
        .from("projects")
        .update({
            status: "review",
            last_activity_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            unread_creator_count: (currentProject?.unread_creator_count || 0) + 1,
        })
        .eq("id", projectId);

    return { version: data, error: null };
}
