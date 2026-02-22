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

export async function createProject({ title, description, platform, creatorId, editorId, deadline, priority }) {
    const insertData = {
        title,
        description: description || null,
        platform,
        creator_id: creatorId,
        priority: priority || "normal",
    };

    if (deadline) {
        insertData.deadline = new Date(deadline).toISOString();
    }

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
            status: "pending_acceptance",
            updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .select()
        .single();
    if (error) console.error("[Helpers] assignEditor error:", error.message);
    return { project: data, error };
}

export async function acceptAssignment(projectId) {
    const { data, error } = await supabase
        .from("projects")
        .update({
            status: "in_edit",
            updated_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .select()
        .single();
    if (error) console.error("[Helpers] acceptAssignment error:", error.message);
    return { project: data, error };
}

export async function rejectAssignment(projectId) {
    const { data, error } = await supabase
        .from("projects")
        .update({
            editor_id: null,
            status: "briefing",
            updated_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .select()
        .single();
    if (error) console.error("[Helpers] rejectAssignment error:", error.message);
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
            unread_editor_count: 1,
        })
        .eq("id", projectId)
        .select()
        .single();

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
        .order("created_at", { ascending: false });
    if (error) console.error("[Helpers] getProjectVersions error:", error.message);
    return { versions: data || [], error };
}

export async function getNextVersionNumber(projectId) {
    const { data, error } = await supabase
        .from("project_versions")
        .select("version_number")
        .eq("project_id", projectId)
        .eq("type", "edited")
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error("[Helpers] getNextVersionNumber error:", error.message);
        return 1;
    }
    return data ? data.version_number + 1 : 1;
}

export async function uploadVersion(projectId, userId, file, versionNumber, type = "edited", comment = null) {
    // Path: projects/{projectId}/{type}_v{versionNumber}_{timestamp}/{filename}
    const timestamp = Date.now();
    const filePath = `projects/${projectId}/${type}_v${versionNumber}_${timestamp}/${file.name}`;

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
    const insertData = {
        project_id: projectId,
        uploaded_by: userId,
        version_number: versionNumber,
        file_url: fileUrl,
        type: type,
    };
    if (comment) insertData.comment = comment;

    let data, insertError;
    ({ data, error: insertError } = await supabase
        .from("project_versions")
        .insert([insertData])
        .select()
        .single());

    // If comment column doesn't exist, retry without it
    if (insertError && comment) {
        delete insertData.comment;
        ({ data, error: insertError } = await supabase
            .from("project_versions")
            .insert([insertData])
            .select()
            .single());
    }

    if (insertError) {
        console.error("[Helpers] Version insert error:", insertError.message);
        return { version: null, error: insertError };
    }

    // 4. Only change status to review for edited versions
    if (type === "edited") {
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
    } else {
        // Raw footage upload — just update timestamps
        await supabase
            .from("projects")
            .update({
                last_activity_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", projectId);
    }

    return { version: data, error: null };
}

export async function deleteVersion(versionId, fileUrl) {
    // 1. Extract storage path from the signed URL
    // Signed URLs look like: https://<host>/storage/v1/object/sign/project-files/<path>?token=...
    let storagePath = null;
    try {
        const match = fileUrl.match(/\/sign\/project-files\/([^?]+)/);
        if (match) storagePath = decodeURIComponent(match[1]);
    } catch (_) { }

    // 2. Delete the DB row
    const { error: dbError } = await supabase
        .from("project_versions")
        .delete()
        .eq("id", versionId);

    if (dbError) {
        console.error("[Helpers] deleteVersion DB error:", dbError.message);
        return { error: dbError };
    }

    // 3. Delete from storage (best-effort, don't block on error)
    if (storagePath) {
        await supabase.storage.from("project-files").remove([storagePath]);
    }

    return { error: null };
}



// ─── Video Comments ──────────────────────────────────────

export function formatTimestamp(seconds) {
    if (!seconds && seconds !== 0) return "0:00";
    const s = Math.floor(seconds);
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

export async function getVideoComments(versionId) {
    const { data, error } = await supabase
        .from("video_comments")
        .select(`
            *,
            user:profiles!user_id(id, name, avatar_url)
        `)
        .eq("version_id", versionId)
        .order("timestamp_seconds", { ascending: true });
    if (error) console.error("[Helpers] getVideoComments error:", error.message);
    return { comments: data || [], error };
}

export async function addVideoComment(projectId, versionId, userId, timestampSeconds, content) {
    const { data, error } = await supabase
        .from("video_comments")
        .insert([{ project_id: projectId, version_id: versionId, user_id: userId, timestamp_seconds: timestampSeconds, content }])
        .select(`*, user:profiles!user_id(id, name, avatar_url)`)
        .single();
    if (error) console.error("[Helpers] addVideoComment error:", error.message);
    return { comment: data, error };
}

export async function updateVideoComment(commentId, content) {
    const { data, error } = await supabase
        .from("video_comments")
        .update({ content })
        .eq("id", commentId)
        .select(`*, user:profiles!user_id(id, name, avatar_url)`)
        .single();
    if (error) console.error("[Helpers] updateVideoComment error:", error.message);
    return { comment: data, error };
}

export async function deleteVideoComment(commentId) {
    const { error } = await supabase.from("video_comments").delete().eq("id", commentId);
    if (error) console.error("[Helpers] deleteVideoComment error:", error.message);
    return { error };
}

export async function resolveVideoComment(commentId, isResolved) {
    const { data, error } = await supabase
        .from("video_comments")
        .update({ is_resolved: isResolved })
        .eq("id", commentId)
        .select(`*, user:profiles!user_id(id, name, avatar_url)`)
        .single();
    if (error) console.error("[Helpers] resolveVideoComment error:", error.message);
    return { comment: data, error };
}

export function subscribeToVideoComments(versionId, onUpdate) {
    const channel = supabase
        .channel(`video_comments:${versionId}`)
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "video_comments",
            filter: `version_id=eq.${versionId}`,
        }, () => onUpdate())
        .subscribe();
    return channel;
}

/**
 * Fetch all messages for a project (ordered by created_at ascending)
 */

export async function getProjectMessages(projectId) {
    const { data, error } = await supabase
        .from("messages")
        .select(`
            *,
            sender:profiles!sender_id(id, name, avatar_url, role)
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

    if (error) console.error("[Helpers] getProjectMessages error:", error.message);
    return { messages: data || [], error };
}

/**
 * Send a new message to a project
 */
export async function sendMessage(projectId, senderId, content) {
    // 1. Insert the message
    const { data, error } = await supabase
        .from("messages")
        .insert([{
            project_id: projectId,
            sender_id: senderId,
            content: content.trim(),
        }])
        .select(`
            *,
            sender:profiles!sender_id(id, name, avatar_url, role)
        `)
        .single();

    if (error) {
        console.error("[Helpers] sendMessage error:", error.message);
        return { message: null, error };
    }

    // 2. Get project to determine who to notify
    const { data: project } = await supabase
        .from("projects")
        .select("creator_id, editor_id, unread_creator_messages, unread_editor_messages")
        .eq("id", projectId)
        .single();

    if (project) {
        // Increment unread count for the OTHER person
        const isCreator = senderId === project.creator_id;
        const updateField = isCreator ? "unread_editor_messages" : "unread_creator_messages";
        const currentCount = isCreator
            ? (project.unread_editor_messages || 0)
            : (project.unread_creator_messages || 0);

        await supabase
            .from("projects")
            .update({
                [updateField]: currentCount + 1,
                last_activity_at: new Date().toISOString(),
            })
            .eq("id", projectId);
    }

    return { message: data, error: null };
}

/**
 * Reset unread message count for current user's role
 */
export async function resetUnreadMessages(projectId, role) {
    const field = role === "creator" ? "unread_creator_messages" : "unread_editor_messages";
    const { error } = await supabase
        .from("projects")
        .update({ [field]: 0 })
        .eq("id", projectId);

    if (error) console.error("[Helpers] resetUnreadMessages error:", error.message);
}

/**
 * Subscribe to new messages in real-time
 * Returns the subscription channel (call .unsubscribe() to cleanup)
 */
export function subscribeToMessages(projectId, onNewMessage) {
    const channel = supabase
        .channel(`messages:${projectId}`)
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "messages",
                filter: `project_id=eq.${projectId}`,
            },
            async (payload) => {
                // Fetch the full message with sender info
                const { data } = await supabase
                    .from("messages")
                    .select(`
                        *,
                        sender:profiles!sender_id(id, name, avatar_url, role)
                    `)
                    .eq("id", payload.new.id)
                    .single();

                if (data) {
                    onNewMessage(data);
                }
            }
        )
        .subscribe();

    return channel;
}
