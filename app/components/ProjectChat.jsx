"use client";

import { useEffect, useState, useRef } from "react";
import {
    getProjectMessages,
    sendMessage,
    subscribeToMessages,
    resetUnreadMessages
} from "@/lib/supabase/helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send } from "lucide-react";

export default function ProjectChat({ projectId, currentUser, userProfile, project }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const loadMessages = async () => {
            setLoading(true);
            const { messages: msgs } = await getProjectMessages(projectId);
            setMessages(msgs);
            setLoading(false);
            if (userProfile?.role) {
                await resetUnreadMessages(projectId, userProfile.role);
            }
        };
        loadMessages();
    }, [projectId, userProfile?.role]);

    useEffect(() => {
        const channel = subscribeToMessages(projectId, (newMsg) => {
            setMessages((prev) => {
                if (prev.find((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
            });
        });
        return () => { channel.unsubscribe(); };
    }, [projectId]);

    useEffect(() => { scrollToBottom(); }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;
        setSending(true);
        const content = newMessage.trim();
        setNewMessage("");
        const { error } = await sendMessage(projectId, currentUser.id, content);
        if (error) { setNewMessage(content); console.error("Failed to send:", error); }
        setSending(false);
        inputRef.current?.focus();
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        if (isToday) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return date.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const isOwn = (msg) => msg.sender_id === currentUser.id;
    const otherParticipant = userProfile?.role === "creator" ? project?.editor : project?.creator;

    // Group messages by sender for compact display
    const groupedMessages = messages.reduce((groups, msg, idx) => {
        const prev = messages[idx - 1];
        const sameGroup = prev && prev.sender_id === msg.sender_id &&
            new Date(msg.created_at) - new Date(prev.created_at) < 5 * 60 * 1000;
        groups.push({ ...msg, showHeader: !sameGroup });
        return groups;
    }, []);

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Messages area with gray background */}
            <div className="flex-1 overflow-y-auto bg-[#F5F6F7] dark:bg-neutral-900/50 px-6 py-4">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-muted border-t-primary" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-background border flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground">No messages yet</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {otherParticipant ? `Start a conversation with ${otherParticipant.name}` : "Start the conversation!"}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-1 max-w-[760px] mx-auto">
                        {groupedMessages.map((msg) => {
                            const own = isOwn(msg);
                            return (
                                <div key={msg.id} className={`flex items-end gap-2 ${own ? "flex-row-reverse" : "flex-row"} ${msg.showHeader ? "mt-4" : "mt-1"}`}>
                                    {/* Avatar — other person only, show only on header message */}
                                    <div className="w-7 shrink-0 self-end">
                                        {!own && msg.showHeader && (
                                            <Avatar className="h-7 w-7">
                                                <AvatarImage src={msg.sender?.avatar_url} />
                                                <AvatarFallback className="text-[10px]">{msg.sender?.name?.[0]}</AvatarFallback>
                                            </Avatar>
                                        )}
                                    </div>

                                    <div className={`flex flex-col max-w-[65%] ${own ? "items-end" : "items-start"}`}>
                                        {/* Sender name + time header */}
                                        {msg.showHeader && (
                                            <div className={`flex items-center gap-2 mb-1 ${own ? "flex-row-reverse" : "flex-row"}`}>
                                                {!own && <span className="text-[11px] font-semibold text-foreground/70">{msg.sender?.name}</span>}
                                                <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                                            </div>
                                        )}

                                        {/* Bubble */}
                                        <div
                                            className={`px-3 py-2 text-sm leading-relaxed break-words
                                                ${own
                                                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-[8px] rounded-br-[2px]"
                                                    : "bg-white dark:bg-neutral-800 text-foreground rounded-[8px] rounded-bl-[2px] shadow-sm border border-border/50"
                                                }`}
                                        >
                                            {msg.content}
                                        </div>

                                        {/* Timestamp below (non-header messages) */}
                                        {!msg.showHeader && (
                                            <span className="text-[10px] text-muted-foreground mt-0.5 px-1">{formatTime(msg.created_at)}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} className="h-2" />
                    </div>
                )}
            </div>

            {/* Input bar — pinned to bottom */}
            <div className="shrink-0 border-t bg-background px-6 py-3">
                <form onSubmit={handleSend} className="flex items-center gap-3 max-w-[760px] mx-auto">
                    <Input
                        ref={inputRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                        placeholder="Type a message..."
                        disabled={sending}
                        className="flex-1 h-11 rounded-lg bg-muted/50 border-muted-foreground/20 focus:bg-background focus-visible:ring-1"
                        autoComplete="off"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        className="h-11 w-11 rounded-lg shrink-0"
                        disabled={!newMessage.trim() || sending}
                    >
                        {sending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
