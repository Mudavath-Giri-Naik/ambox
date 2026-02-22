"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    getVideoComments, addVideoComment, updateVideoComment,
    deleteVideoComment, resolveVideoComment, subscribeToVideoComments,
    formatTimestamp,
} from "@/lib/supabase/helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
    X, Play, Pause, Volume2, VolumeX, Maximize2,
    MessageSquare, Send, Pencil, Trash2, CheckCircle2, Circle,
    Clock, ChevronDown
} from "lucide-react";

function timeAgo(dateString) {
    if (!dateString) return "";
    const seconds = Math.floor((Date.now() - new Date(dateString)) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

/**
 * VideoCommentModal
 * Props:
 *   version        — version object { id, file_url, version_number, type }
 *   label          — display label e.g. "Raw #1" or "v2"
 *   projectId      — current project id
 *   currentUser    — supabase auth user
 *   userProfile    — { id, name, avatar_url, role }
 *   isCreator      — boolean
 *   onClose()      — close callback
 */
export default function VideoCommentModal({
    version, label, projectId, currentUser, userProfile, isCreator, onClose
}) {
    const videoRef = useRef(null);
    const progressRef = useRef(null);
    const [comments, setComments] = useState([]);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [newComment, setNewComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState("");
    const [showResolved, setShowResolved] = useState(true);
    const [hoveredComment, setHoveredComment] = useState(null); // for timeline marker tooltip
    const [tooltipPos, setTooltipPos] = useState(0);
    const channelRef = useRef(null);

    const fetchComments = useCallback(async () => {
        if (!version?.id) return;
        const { comments: c } = await getVideoComments(version.id);
        setComments(c);
    }, [version?.id]);

    useEffect(() => {
        fetchComments();
        // Real-time subscription
        channelRef.current = subscribeToVideoComments(version.id, fetchComments);
        return () => { channelRef.current?.unsubscribe(); };
    }, [version?.id, fetchComments]);

    // Video event handlers
    const handleTimeUpdate = () => {
        const v = videoRef.current;
        if (!v) return;
        setCurrentTime(v.currentTime);
        setProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0);
    };

    const handleLoadedMetadata = () => {
        setDuration(videoRef.current?.duration || 0);
    };

    const handlePlayPause = () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) { v.play(); setIsPlaying(true); }
        else { v.pause(); setIsPlaying(false); }
    };

    const handleMute = () => {
        const v = videoRef.current;
        if (!v) return;
        v.muted = !v.muted;
        setIsMuted(v.muted);
    };

    const seekTo = (seconds) => {
        const v = videoRef.current;
        if (!v) return;
        v.currentTime = Math.max(0, Math.min(seconds, v.duration || seconds));
        v.pause();
        setIsPlaying(false);
    };

    const handleProgressClick = (e) => {
        if (!videoRef.current || !progressRef.current) return;
        const rect = progressRef.current.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        seekTo(pct * (videoRef.current.duration || 0));
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !currentUser) return;
        setSubmitting(true);
        await addVideoComment(projectId, version.id, currentUser.id, currentTime, newComment.trim());
        setNewComment("");
        setSubmitting(false);
        await fetchComments();
    };

    const handleDeleteComment = async (id) => {
        if (!confirm("Delete this comment?")) return;
        await deleteVideoComment(id);
        await fetchComments();
    };

    const handleStartEdit = (c) => {
        setEditingId(c.id);
        setEditText(c.content);
    };

    const handleSaveEdit = async () => {
        if (!editText.trim()) return;
        await updateVideoComment(editingId, editText.trim());
        setEditingId(null);
        setEditText("");
        await fetchComments();
    };

    const handleResolve = async (comment) => {
        await resolveVideoComment(comment.id, !comment.is_resolved);
        await fetchComments();
    };

    const filteredComments = showResolved
        ? comments
        : comments.filter((c) => !c.is_resolved);

    const unresolvedCount = comments.filter((c) => !c.is_resolved).length;

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-background rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
                    <Badge variant="secondary" className="text-xs font-mono">{label}</Badge>
                    <span className="text-sm font-semibold flex-1">Video Comments</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {unresolvedCount} open · {comments.length} total
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex flex-1 overflow-hidden min-h-0">
                    {/* Video + Controls (left) */}
                    <div className="flex-1 flex flex-col min-w-0 p-4 gap-3">
                        {/* Video */}
                        <div className="relative bg-black rounded-lg overflow-hidden">
                            <video
                                ref={videoRef}
                                src={version.file_url}
                                className="w-full max-h-[42vh] object-contain"
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                preload="metadata"
                            />
                        </div>

                        {/* Custom Controls */}
                        <div className="space-y-2">
                            {/* Timeline with markers */}
                            <div className="relative">
                                <div
                                    ref={progressRef}
                                    className="relative h-2 bg-muted rounded-full cursor-pointer overflow-visible"
                                    onClick={handleProgressClick}
                                >
                                    {/* Progress fill */}
                                    <div
                                        className="absolute inset-y-0 left-0 bg-primary rounded-full pointer-events-none transition-all"
                                        style={{ width: `${progress}%` }}
                                    />
                                    {/* Comment markers */}
                                    {duration > 0 && comments.map((c) => {
                                        const pct = (c.timestamp_seconds / duration) * 100;
                                        return (
                                            <div
                                                key={c.id}
                                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 group"
                                                style={{ left: `${pct}%` }}
                                                onMouseEnter={(e) => {
                                                    setHoveredComment(c);
                                                    setTooltipPos(pct);
                                                }}
                                                onMouseLeave={() => setHoveredComment(null)}
                                                onClick={(e) => { e.stopPropagation(); seekTo(c.timestamp_seconds); }}
                                            >
                                                <div className={`w-2.5 h-2.5 rounded-full border-2 border-background cursor-pointer transition-transform hover:scale-150 ${c.is_resolved ? "bg-green-500" : "bg-yellow-400"}`} />
                                            </div>
                                        );
                                    })}
                                    {/* Tooltip */}
                                    {hoveredComment && (
                                        <div
                                            className="absolute bottom-5 -translate-x-1/2 bg-popover border shadow-lg rounded px-2 py-1.5 min-w-[120px] max-w-[200px] pointer-events-none z-20"
                                            style={{ left: `${tooltipPos}%` }}
                                        >
                                            <p className="text-[10px] font-semibold text-foreground">{hoveredComment.user?.name}</p>
                                            <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{hoveredComment.content}</p>
                                            <p className="text-[9px] text-muted-foreground mt-0.5">⏱ {formatTimestamp(hoveredComment.timestamp_seconds)} · Click to seek</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Control buttons + time */}
                            <div className="flex items-center gap-2">
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={handlePlayPause}>
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                </Button>
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={handleMute}>
                                    {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                                </Button>
                                <span className="text-xs font-mono text-muted-foreground tabular-nums">
                                    {formatTimestamp(currentTime)} / {formatTimestamp(duration)}
                                </span>
                            </div>
                        </div>

                        {/* Add Comment Input */}
                        <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
                            <div className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3 text-primary" />
                                <span className="text-xs font-medium">Comment at</span>
                                <Badge variant="outline" className="text-xs font-mono px-1.5 h-5">{formatTimestamp(currentTime)}</Badge>
                                <span className="text-[10px] text-muted-foreground">(pause video to capture exact time)</span>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                                    placeholder={`Add comment at ${formatTimestamp(currentTime)}...`}
                                    className="flex-1 border border-input rounded-md px-3 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                    disabled={submitting}
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 gap-1.5 text-xs shrink-0"
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim() || submitting}
                                >
                                    <Send className="h-3 w-3" />
                                    Add
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Comments Panel (right) */}
                    <div className="w-[300px] shrink-0 border-l flex flex-col overflow-hidden">
                        {/* Panel header */}
                        <div className="flex items-center gap-2 px-3 py-2.5 border-b shrink-0">
                            <span className="text-xs font-semibold flex-1">Comments</span>
                            <button
                                type="button"
                                onClick={() => setShowResolved(!showResolved)}
                                className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${showResolved ? "bg-muted text-foreground border-border" : "text-muted-foreground border-transparent hover:border-border"}`}
                            >
                                {showResolved ? "Hide Resolved" : "Show Resolved"}
                            </button>
                        </div>

                        {/* Comments list */}
                        <div className="flex-1 overflow-y-auto space-y-0 divide-y">
                            {filteredComments.length === 0 && (
                                <div className="py-8 text-center text-xs text-muted-foreground px-4">
                                    <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-40" />
                                    No comments yet.<br />Pause the video and add one!
                                </div>
                            )}
                            {filteredComments.map((c) => (
                                <div key={c.id} className={`px-3 py-2.5 space-y-1.5 transition-opacity ${c.is_resolved ? "opacity-60" : ""}`}>
                                    {/* Top row */}
                                    <div className="flex items-center gap-1.5">
                                        {/* Timestamp badge — click to seek */}
                                        <button
                                            type="button"
                                            onClick={() => seekTo(c.timestamp_seconds)}
                                            className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/60 transition-colors px-1.5 py-0.5 rounded text-[10px] font-mono font-medium shrink-0"
                                        >
                                            ⏱ {formatTimestamp(c.timestamp_seconds)}
                                        </button>
                                        <Avatar className="h-4 w-4 shrink-0">
                                            <AvatarImage src={c.user?.avatar_url} />
                                            <AvatarFallback className="text-[7px]">{c.user?.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-[10px] font-medium truncate flex-1">{c.user?.name}</span>
                                        <span className="text-[9px] text-muted-foreground shrink-0">{timeAgo(c.created_at)}</span>
                                    </div>

                                    {/* Comment content */}
                                    {editingId === c.id ? (
                                        <div className="space-y-1">
                                            <input
                                                value={editText}
                                                onChange={(e) => setEditText(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditingId(null); }}
                                                className="w-full border border-input rounded px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                                autoFocus
                                            />
                                            <div className="flex gap-1">
                                                <Button size="sm" className="h-5 text-[10px] px-2" onClick={handleSaveEdit}>Save</Button>
                                                <Button size="sm" variant="ghost" className="h-5 text-[10px] px-2" onClick={() => setEditingId(null)}>Cancel</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className={`text-xs leading-snug ${c.is_resolved ? "line-through text-muted-foreground" : ""}`}>{c.content}</p>
                                    )}

                                    {/* Actions row */}
                                    <div className="flex items-center gap-1">
                                        {/* Resolve (creator only, or own comment) */}
                                        {(isCreator || c.user?.id === currentUser?.id) && (
                                            <button
                                                type="button"
                                                onClick={() => handleResolve(c)}
                                                className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                                title={c.is_resolved ? "Mark unresolved" : "Mark resolved"}
                                            >
                                                {c.is_resolved
                                                    ? <CheckCircle2 className="h-3 w-3 text-green-500" />
                                                    : <Circle className="h-3 w-3" />
                                                }
                                                <span>{c.is_resolved ? "Resolved" : "Resolve"}</span>
                                            </button>
                                        )}
                                        <span className="flex-1" />
                                        {/* Edit / Delete (own comment only) */}
                                        {c.user?.id === currentUser?.id && editingId !== c.id && (
                                            <>
                                                <button type="button" onClick={() => handleStartEdit(c)} className="text-[10px] text-muted-foreground hover:text-foreground p-0.5">
                                                    <Pencil className="h-2.5 w-2.5" />
                                                </button>
                                                <button type="button" onClick={() => handleDeleteComment(c.id)} className="text-[10px] text-destructive/60 hover:text-destructive p-0.5">
                                                    <Trash2 className="h-2.5 w-2.5" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
