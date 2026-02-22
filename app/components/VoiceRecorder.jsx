"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Play, Pause, Trash2, RotateCcw, CheckCircle2, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAX_DURATION = 5 * 60; // 5 minutes in seconds

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * VoiceRecorder
 * Props:
 *   onChange(blob | null) — called when recording completes or is cleared
 *   disabled — disables interaction
 */
export default function VoiceRecorder({ onChange, disabled }) {
    const [state, setState] = useState("idle"); // idle | requesting | recording | recorded | error
    const [duration, setDuration] = useState(0);
    const [audioUrl, setAudioUrl] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playProgress, setPlayProgress] = useState(0);
    const [recordedDuration, setRecordedDuration] = useState(0);
    const [errorMsg, setErrorMsg] = useState("");

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const audioRef = useRef(null);
    const streamRef = useRef(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearInterval(timerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, []);

    const startRecording = useCallback(async () => {
        setErrorMsg("");
        setState("requesting");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Pick best supported mime type
            const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"]
                .find((m) => MediaRecorder.isTypeSupported(m)) || "";

            const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
            mediaRecorderRef.current = mr;
            chunksRef.current = [];

            mr.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mr.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                setRecordedDuration(duration);
                setState("recorded");
                onChange?.(blob);
                // Stop mic tracks
                streamRef.current?.getTracks().forEach((t) => t.stop());
            };

            mr.start(250); // collect data every 250ms
            setState("recording");
            setDuration(0);

            timerRef.current = setInterval(() => {
                setDuration((prev) => {
                    const next = prev + 1;
                    if (next >= MAX_DURATION) {
                        stopRecording();
                    }
                    return next;
                });
            }, 1000);
        } catch (err) {
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                setErrorMsg("Microphone permission denied. Please allow microphone access in your browser settings.");
            } else {
                setErrorMsg("Could not start recording: " + err.message);
            }
            setState("error");
        }
    }, [duration, onChange]);

    const stopRecording = useCallback(() => {
        clearInterval(timerRef.current);
        mediaRecorderRef.current?.stop();
    }, []);

    const handleReRecord = useCallback(() => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setDuration(0);
        setRecordedDuration(0);
        setIsPlaying(false);
        setPlayProgress(0);
        setState("idle");
        onChange?.(null);
    }, [audioUrl, onChange]);

    const handleRemove = useCallback(() => {
        handleReRecord();
    }, [handleReRecord]);

    // Audio player controls
    const togglePlay = useCallback(() => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    }, [isPlaying]);

    const handleAudioTimeUpdate = () => {
        if (!audioRef.current) return;
        const { currentTime, duration: dur } = audioRef.current;
        setPlayProgress(dur ? (currentTime / dur) * 100 : 0);
    };

    const handleAudioEnded = () => {
        setIsPlaying(false);
        setPlayProgress(0);
    };

    const handleSeek = (e) => {
        if (!audioRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = x / rect.width;
        audioRef.current.currentTime = pct * audioRef.current.duration;
    };

    return (
        <div className="rounded-lg border border-dashed bg-muted/20 p-3 space-y-2.5">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Mic className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Voice Brief</span>
                <span className="text-[10px] text-muted-foreground ml-auto">Optional · Telugu, Hindi, or English</span>
            </div>

            {/* IDLE */}
            {(state === "idle" || state === "requesting") && (
                <div className="flex flex-col items-center gap-2 py-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 h-8 text-xs"
                        onClick={startRecording}
                        disabled={disabled || state === "requesting"}
                    >
                        <Mic className="h-3.5 w-3.5 text-red-500" />
                        {state === "requesting" ? "Requesting mic..." : "Start Recording"}
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center">
                        Explain edits — timestamps, effects, music, etc. Max 5 minutes.
                    </p>
                </div>
            )}

            {/* RECORDING */}
            {state === "recording" && (
                <div className="flex flex-col items-center gap-2.5 py-1">
                    <div className="flex items-center gap-2">
                        {/* Pulsing red dot */}
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                        </span>
                        <span className="text-sm font-mono font-semibold tabular-nums text-red-600 dark:text-red-400">
                            {formatTime(duration)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">/ 5:00 max</span>
                    </div>
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="gap-1.5 h-8 text-xs"
                        onClick={stopRecording}
                        disabled={disabled}
                    >
                        <Square className="h-3 w-3 fill-current" />
                        Stop Recording
                    </Button>
                </div>
            )}

            {/* RECORDED */}
            {state === "recorded" && audioUrl && (
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        <span className="text-[11px] font-medium text-green-700 dark:text-green-400">
                            Recorded — {formatTime(recordedDuration)}
                        </span>
                    </div>

                    {/* Audio player */}
                    <div className="flex items-center gap-2 p-2 rounded bg-muted/50 border">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={togglePlay}
                        >
                            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        </Button>
                        {/* Progress bar */}
                        <div
                            className="flex-1 h-1.5 bg-muted rounded-full cursor-pointer overflow-hidden"
                            onClick={handleSeek}
                        >
                            <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${playProgress}%` }}
                            />
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                            {formatTime(recordedDuration)}
                        </span>
                        <audio
                            ref={audioRef}
                            src={audioUrl}
                            onTimeUpdate={handleAudioTimeUpdate}
                            onEnded={handleAudioEnded}
                            className="hidden"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] gap-1 px-2"
                            onClick={handleReRecord}
                            disabled={disabled}
                        >
                            <RotateCcw className="h-2.5 w-2.5" /> Re-record
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] gap-1 px-2 text-destructive hover:text-destructive"
                            onClick={handleRemove}
                            disabled={disabled}
                        >
                            <Trash2 className="h-2.5 w-2.5" /> Remove
                        </Button>
                    </div>
                </div>
            )}

            {/* ERROR */}
            {state === "error" && (
                <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 border border-destructive/20">
                    <MicOff className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                    <div className="flex-1">
                        <p className="text-[11px] text-destructive">{errorMsg}</p>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-5 text-[10px] px-0 mt-1"
                            onClick={() => setState("idle")}
                        >
                            Try again
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
