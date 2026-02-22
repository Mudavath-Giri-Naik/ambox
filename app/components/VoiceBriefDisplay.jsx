"use client";

import { useState, useRef, useEffect } from "react";
import {
    Mic, Play, Pause, Square, ChevronDown, ChevronUp, Clock, AlertTriangle,
    FileText, Loader2, CheckCircle2, Volume2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const LANG_COLORS = {
    telugu: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
    hindi: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
    english: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    mixed: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
};

const PRIORITY_COLORS = {
    high: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    normal: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

/* ─── Compact inline audio player (icon only, expandable) ─── */
function CompactAudioPlayer({ url }) {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [current, setCurrent] = useState(0);
    const [expanded, setExpanded] = useState(false);

    const toggle = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            const p = audioRef.current.play();
            if (p) p.catch(() => { });
        }
        setIsPlaying(!isPlaying);
    };

    const stop = () => {
        if (!audioRef.current) return;
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
        setProgress(0);
        setCurrent(0);
    };

    const formatTime = (s) => {
        if (!s || isNaN(s)) return "0:00";
        return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
    };

    const handleSeek = (e) => {
        if (!audioRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * audioRef.current.duration;
    };

    return (
        <div className="inline-flex items-center gap-1">
            {/* Play/Pause icon button */}
            <Button
                type="button" variant={isPlaying ? "default" : "outline"} size="icon"
                className={`h-7 w-7 shrink-0 rounded-full transition-all ${isPlaying ? "animate-pulse shadow-sm shadow-primary/30" : ""}`}
                onClick={toggle}
            >
                {isPlaying ? <Pause className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            </Button>

            {/* Expanded inline player when playing or expanded */}
            {(isPlaying || expanded) && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-full border">
                    <div className="w-20 h-1 bg-muted rounded-full overflow-hidden cursor-pointer" onClick={handleSeek}>
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[9px] text-muted-foreground tabular-nums">{formatTime(current)}/{formatTime(duration)}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={stop}>
                        <Square className="h-2.5 w-2.5" />
                    </Button>
                </div>
            )}

            <audio
                ref={audioRef}
                src={url}
                onTimeUpdate={() => {
                    const a = audioRef.current;
                    if (!a) return;
                    setCurrent(a.currentTime);
                    setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0);
                }}
                onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                onEnded={() => { setIsPlaying(false); setProgress(0); setCurrent(0); }}
                className="hidden"
            />
        </div>
    );
}

/**
 * VoiceBriefDisplay — compact redesign
 * Shows:
 *   1. Editing Instructions prominently with clean typography
 *   2. Voice Brief as a compact play icon (expandable inline player)
 *   3. Transcript as a collapsible section
 * Props:
 *   project — full project object from DB
 *   onRefetch() — called to reload project data (for poll-refresh)
 */
export default function VoiceBriefDisplay({ project, onRefetch }) {
    const [showTranscript, setShowTranscript] = useState(false);
    const pollRef = useRef(null);

    const voiceBriefUrl = project?.voice_brief_url;
    const transcript = project?.voice_transcript;
    const parsed = project?.parsed_instructions;
    const lang = project?.brief_language;

    // Poll if brief is uploaded but not yet transcribed
    useEffect(() => {
        if (voiceBriefUrl && !transcript && onRefetch) {
            pollRef.current = setInterval(() => {
                onRefetch();
            }, 5000);
        }
        return () => clearInterval(pollRef.current);
    }, [voiceBriefUrl, transcript, onRefetch]);

    if (!voiceBriefUrl) return null;

    return (
        <div className="space-y-4">
            {/* ── Voice Brief: Compact icon row ── */}
            <div className="flex items-center gap-2 flex-wrap">
                <CompactAudioPlayer url={voiceBriefUrl} />
                <span className="text-[11px] font-medium text-muted-foreground">Voice Brief</span>
                {lang && (
                    <Badge className={`text-[9px] h-4 px-1.5 capitalize ${LANG_COLORS[lang] || LANG_COLORS.english}`}>
                        {lang}
                    </Badge>
                )}
                {!transcript && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" /> Processing…
                    </span>
                )}
                {transcript && (
                    <button
                        type="button"
                        onClick={() => setShowTranscript(!showTranscript)}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors ml-auto"
                    >
                        <FileText className="h-2.5 w-2.5" />
                        {showTranscript ? "Hide" : "View"} Transcript
                        {showTranscript ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                    </button>
                )}
            </div>

            {/* Transcript (collapsible) */}
            {showTranscript && transcript && (
                <p className="text-[11px] text-muted-foreground italic leading-relaxed bg-muted/40 rounded-lg p-3 border">
                    {transcript}
                </p>
            )}

            {/* ── Editing Instructions (prominent, clean typography) ── */}
            {parsed && (
                <div className="space-y-3">
                    {/* Summary callout */}
                    {parsed.summary && (
                        <div className="px-4 py-3 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/60 dark:border-amber-800/40">
                            <p className="text-[12px] font-medium text-amber-900 dark:text-amber-200 leading-relaxed">{parsed.summary}</p>
                        </div>
                    )}

                    {/* Instructions list — clean numbered cards */}
                    {parsed.instructions?.length > 0 && (
                        <div className="space-y-2">
                            {parsed.instructions.map((instr, i) => (
                                <div key={i} className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/20 transition-colors">
                                    {/* Step number */}
                                    <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <p className="text-[12px] font-medium leading-snug text-foreground">{instr.instruction}</p>
                                        {/* Metadata row */}
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {(instr.timestamp_start || instr.timestamp_end) && (
                                                <Badge variant="outline" className="text-[9px] h-4 px-1 gap-0.5 font-mono">
                                                    <Clock className="h-2 w-2" />
                                                    {instr.timestamp_start || "?"}{instr.timestamp_end ? ` – ${instr.timestamp_end}` : ""}
                                                </Badge>
                                            )}
                                            {instr.priority && (
                                                <Badge className={`text-[9px] h-4 px-1 capitalize ${PRIORITY_COLORS[instr.priority] || PRIORITY_COLORS.normal}`}>
                                                    {instr.priority}
                                                </Badge>
                                            )}
                                        </div>
                                        {instr.original_text && instr.original_text !== instr.instruction && (
                                            <p className="text-[10px] text-muted-foreground italic">{instr.original_text}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* General Notes */}
                    {parsed.general_notes?.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">General Notes</p>
                            <ul className="space-y-1">
                                {parsed.general_notes.map((note, i) => (
                                    <li key={i} className="text-[11px] flex items-start gap-2 text-foreground/80">
                                        <span className="text-muted-foreground mt-0.5 shrink-0">•</span>
                                        <span>{note}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Unclear Parts */}
                    {parsed.unclear_parts?.length > 0 && (
                        <div className="px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                                <AlertTriangle className="h-3 w-3 text-amber-600" />
                                <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-200">Needs Clarification</p>
                            </div>
                            <ul className="space-y-0.5">
                                {parsed.unclear_parts.map((part, i) => (
                                    <li key={i} className="text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-1.5">
                                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /><span>{part}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
