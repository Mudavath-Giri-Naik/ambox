"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Star } from "lucide-react";

function StarIcon({ filled, half, size = 20 }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? "#f59e0b" : "none"}
            stroke={filled ? "#f59e0b" : "#d1d5db"}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="inline-block"
        >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    );
}

function StarRating({ value, onChange, interactive = false, size = 20 }) {
    const [hover, setHover] = useState(0);

    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    disabled={!interactive}
                    className={`${interactive ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default"} p-0 border-0 bg-transparent`}
                    onMouseEnter={() => interactive && setHover(star)}
                    onMouseLeave={() => interactive && setHover(0)}
                    onClick={() => interactive && onChange?.(star)}
                >
                    <StarIcon filled={(hover || value) >= star} size={size} />
                </button>
            ))}
        </div>
    );
}

// Compact inline star display for tables
export function StarDisplay({ rating, size = 14 }) {
    if (!rating) return null;
    return (
        <span className="inline-flex items-center gap-1 text-xs">
            <StarIcon filled size={size} />
            <span className="font-medium">{rating}</span>
        </span>
    );
}

// Show average rating stats for editor profile/dashboard
export function EditorRatingStats({ editorId }) {
    const [stats, setStats] = useState(null);
    const [loaded, setLoaded] = useState(false);

    useState(() => {
        if (!editorId) return;
        const fetch = async () => {
            const { data } = await supabase
                .from("projects")
                .select("creator_rating")
                .eq("editor_id", editorId)
                .not("creator_rating", "is", null);

            if (data && data.length > 0) {
                const total = data.length;
                const avg = data.reduce((s, r) => s + r.creator_rating, 0) / total;
                setStats({ avg: Math.round(avg * 10) / 10, total });
            }
            setLoaded(true);
        };
        fetch();
    });

    if (!loaded || !stats) return null;

    return (
        <span className="inline-flex items-center gap-1 text-sm">
            <StarIcon filled size={16} />
            <span className="font-semibold">{stats.avg}</span>
            <span className="text-muted-foreground">({stats.total} review{stats.total !== 1 ? "s" : ""})</span>
        </span>
    );
}

// Main rating component for project page
export default function ProjectRating({ project, isCreator, onRated }) {
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const isCompletedOrApproved = ["completed", "approved"].includes(project?.status);
    const alreadyRated = project?.creator_rating != null;

    // Already rated — show read-only display
    if (alreadyRated) {
        return (
            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-900">
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <StarRating value={project.creator_rating} size={22} />
                        <span className="text-sm font-medium">{project.creator_rating}/5</span>
                        {project.rated_at && (
                            <span className="text-xs text-muted-foreground">
                                Rated on {new Date(project.rated_at).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                    {project.creator_feedback && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                            &ldquo;{project.creator_feedback}&rdquo;
                        </p>
                    )}
                </CardContent>
            </Card>
        );
    }

    // Not completed/approved or not creator — don't show
    if (!isCompletedOrApproved || !isCreator) return null;

    // Successfully submitted in this session
    if (submitted) {
        return (
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10 dark:border-green-900">
                <CardContent className="p-4 text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center justify-center gap-1.5"><CheckCircle className="h-4 w-4" /> Thanks for your rating!</p>
                </CardContent>
            </Card>
        );
    }

    const handleSubmit = async () => {
        if (rating === 0) return;
        setSubmitting(true);

        const { error } = await supabase
            .from("projects")
            .update({
                creator_rating: rating,
                creator_feedback: feedback.trim() || null,
                rated_at: new Date().toISOString(),
            })
            .eq("id", project.id);

        if (!error) {
            // Log activity
            await supabase.from("activity_log").insert([{
                project_id: project.id,
                user_id: project.creator_id,
                action: "project_rated",
                details: { rating, has_feedback: feedback.trim().length > 0 },
            }]);

            setSubmitted(true);
            onRated?.();
        }
        setSubmitting(false);
    };

    return (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-900">
            <CardContent className="p-5 space-y-4">
                <div>
                    <p className="font-semibold text-sm flex items-center gap-1.5"><Star className="h-4 w-4 text-amber-500 fill-amber-500" /> Rate this project</p>
                    <p className="text-xs text-muted-foreground">How was your experience working with this editor?</p>
                </div>

                <StarRating value={rating} onChange={setRating} interactive size={28} />

                <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Share your feedback (optional)..."
                    rows={2}
                    className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={submitting}
                />

                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={rating === 0 || submitting}
                    >
                        {submitting ? "Submitting..." : "Submit Rating"}
                    </Button>
                    <span className="text-xs text-muted-foreground">One-time rating</span>
                </div>
            </CardContent>
        </Card>
    );
}
