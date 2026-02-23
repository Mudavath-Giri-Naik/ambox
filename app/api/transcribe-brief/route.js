import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Force dynamic rendering — never statically evaluated at build time
export const dynamic = "force-dynamic";

export async function POST(request) {
    try {
        // ── Initialize all clients inside the handler ──
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        // ── Parse request body ──
        const { project_id, audio_url } = await request.json();

        if (!project_id || !audio_url) {
            return NextResponse.json(
                { error: "Missing project_id or audio_url" },
                { status: 400 }
            );
        }

        // ── Step 1: Fetch audio and convert to base64 for Gemini ──
        const audioResponse = await fetch(audio_url);
        if (!audioResponse.ok) {
            throw new Error(`Failed to fetch audio: ${audioResponse.statusText}`);
        }

        const audioBuffer = await audioResponse.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString("base64");
        const mimeType = audioResponse.headers.get("content-type") || "audio/webm";

        // ── Step 2: Transcribe + Parse with Gemini 2.0 Flash (single call) ──
        const prompt = `
You are an expert video editing consultant. Listen to this voice brief recording and:
1. Transcribe it accurately.
2. Extract structured editing instructions from the transcript.

Respond ONLY with a valid JSON object in exactly this format (no markdown, no extra text):
{
    "transcript": "The full verbatim transcript of the audio.",
    "language": "detected language (e.g. english, hindi)",
    "summary": "A brief 1-2 sentence overview of the editing style and goals.",
    "instructions": [
        {
            "instruction": "Clear, actionable task for the editor.",
            "timestamp_start": "MM:SS if mentioned, otherwise empty string",
            "timestamp_end": "MM:SS if mentioned, otherwise empty string",
            "priority": "low | normal | high",
            "original_text": "The specific phrase from the transcript that led to this instruction."
        }
    ],
    "general_notes": ["Overall notes about music, color grading, or flow."],
    "unclear_parts": ["Parts of the audio that were ambiguous or need clarification."]
}
        `.trim();

        const geminiResult = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType,
                    data: audioBase64,
                },
            },
        ]);

        const responseText = geminiResult.response.text();

        // Extract JSON — Gemini sometimes wraps output in markdown code fences
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        let parsed = null;
        if (jsonMatch) {
            try {
                parsed = JSON.parse(jsonMatch[0]);
            } catch {
                parsed = null;
            }
        }

        const transcript = parsed?.transcript || responseText;
        const language = parsed?.language || "english";
        const parsedInstructions = parsed
            ? {
                summary: parsed.summary,
                instructions: parsed.instructions,
                general_notes: parsed.general_notes,
                unclear_parts: parsed.unclear_parts,
            }
            : null;

        // ── Step 3: Update Supabase ──
        const { error: updateError } = await supabaseAdmin
            .from("projects")
            .update({
                voice_transcript: transcript,
                brief_language: language,
                parsed_instructions: parsedInstructions,
                updated_at: new Date().toISOString(),
            })
            .eq("id", project_id);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, transcript, parsedInstructions });

    } catch (error) {
        console.error("[transcribe-brief] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
