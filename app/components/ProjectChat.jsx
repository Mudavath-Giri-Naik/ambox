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
import { Card } from "@/components/ui/card";

export default function ProjectChat({ projectId, currentUser, userProfile, project }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Scroll to bottom of messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Load initial messages
    useEffect(() => {
        const loadMessages = async () => {
            setLoading(true);
            const { messages: msgs } = await getProjectMessages(projectId);
            setMessages(msgs);
            setLoading(false);

            // Reset unread count when chat is opened
            if (userProfile?.role) {
                await resetUnreadMessages(projectId, userProfile.role);
            }
        };

        loadMessages();
    }, [projectId, userProfile?.role]);

    // Subscribe to real-time messages
    useEffect(() => {
        const channel = subscribeToMessages(projectId, (newMsg) => {
            // Only add if not already in list (prevent duplicates)
            setMessages((prev) => {
                if (prev.find((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
            });
        });

        // Cleanup subscription on unmount
        return () => {
            channel.unsubscribe();
        };
    }, [projectId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Send message handler
    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        setSending(true);
        const content = newMessage.trim();
        setNewMessage(""); // Clear input immediately for better UX

        const { message, error } = await sendMessage(projectId, currentUser.id, content);

        if (error) {
            // Restore message if failed
            setNewMessage(content);
            console.error("Failed to send message:", error);
        }

        setSending(false);
        inputRef.current?.focus();
    };

    // Format timestamp
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        if (isToday) {
            return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }
        return date.toLocaleDateString([], { month: "short", day: "numeric" }) +
            " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    // Check if message is from current user
    const isOwnMessage = (msg) => msg.sender_id === currentUser.id;

    // Get other participant info
    const otherParticipant = userProfile?.role === "creator" ? project?.editor : project?.creator;

    return (
        <Card className="flex flex-col h-[500px] overflow-hidden">
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium">Project Chat</span>
                </div>
                {otherParticipant && (
                    <div className="flex items-center gap-2 ml-auto text-sm text-muted-foreground">
                        <span>with</span>
                        <Avatar className="h-5 w-5">
                            <AvatarImage src={otherParticipant.avatar_url} />
                            <AvatarFallback className="text-[10px]">
                                {otherParticipant.name?.[0]}
                            </AvatarFallback>
                        </Avatar>
                        <span>{otherParticipant.name}</span>
                    </div>
                )}
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-muted border-t-primary"></div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <div className="text-4xl mb-2">💬</div>
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs">Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex items-end gap-2 ${isOwnMessage(msg) ? "flex-row-reverse" : "flex-row"
                                }`}
                        >
                            {/* Avatar (only show for other person) */}
                            {!isOwnMessage(msg) && (
                                <Avatar className="h-7 w-7 flex-shrink-0">
                                    <AvatarImage src={msg.sender?.avatar_url} />
                                    <AvatarFallback className="text-[10px]">
                                        {msg.sender?.name?.[0]}
                                    </AvatarFallback>
                                </Avatar>
                            )}

                            {/* Message Bubble */}
                            <div
                                className={`max-w-[70%] rounded-2xl px-4 py-2 ${isOwnMessage(msg)
                                        ? "bg-primary text-primary-foreground rounded-br-md"
                                        : "bg-muted rounded-bl-md"
                                    }`}
                            >
                                {/* Sender name (only for other person) */}
                                {!isOwnMessage(msg) && (
                                    <p className="text-[10px] font-medium mb-0.5 opacity-70">
                                        {msg.sender?.name}
                                    </p>
                                )}
                                <p className="text-sm break-words whitespace-pre-wrap">
                                    {msg.content}
                                </p>
                                <p
                                    className={`text-[10px] mt-1 ${isOwnMessage(msg) ? "text-primary-foreground/70" : "text-muted-foreground"
                                        }`}
                                >
                                    {formatTime(msg.created_at)}
                                </p>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSend} className="p-4 border-t bg-background">
                <div className="flex gap-2">
                    <Input
                        ref={inputRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        disabled={sending}
                        className="flex-1"
                        autoComplete="off"
                    />
                    <Button type="submit" disabled={!newMessage.trim() || sending}>
                        {sending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent"></div>
                        ) : (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-4 w-4"
                            >
                                <path d="m22 2-7 20-4-9-9-4Z" />
                                <path d="M22 2 11 13" />
                            </svg>
                        )}
                    </Button>
                </div>
            </form>
        </Card>
    );
}
