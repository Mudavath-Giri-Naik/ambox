import { createClient } from "@supabase/supabase-js";
import { createClient as createDeepgramClient } from "@deepgram/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env["Gemini API Key"]);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Initialize Supabase Admin (needed for server-side updates)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Initialize Deepgram
const deepgram = createDeepgramClient(process.env.DEEPGRAM_API_KEY);

export async function POST(request) {
    try {
        const { project_id, audio_url } = await request.json();

        if (!project_id || !audio_url) {
            return NextResponse.json({ error: "Missing project_id or audio_url" }, { status: 400 });
        }

        // 1. Transcribe with Deepgram
        const { result, error: dgError } = await deepgram.listen.prerecorded.transcribeUrl(
            { url: audio_url },
            { smart_format: true, model: "nova-2", language: "en" }
        );

        if (dgError) throw dgError;

        const transcript = result.results.channels[0].alternatives[0].transcript;
        const language = result.results.channels[0].detected_language || "english";

        // 2. Parse with Gemini 2.0 Flash
        const prompt = `
            You are an expert video editing consultant. I will give you a transcript of a voice brief for a video project. 
            Your goal is to extract structured editing instructions.

            Transcript: "${transcript}"

            Please respond ONLY with a JSON object in the following format:
            {
                "summary": "A brief 1-2 sentence overview of the editing style and goals.",
                "instructions": [
                    {
                        "instruction": "The clear, actionable task for the editor.",
                        "timestamp_start": "MM:SS if mentioned, otherwise leave blank",
                        "timestamp_end": "MM:SS if mentioned, otherwise leave blank",
                        "priority": "low" | "normal" | "high",
                        "original_text": "The specific phrase from the transcript that led to this instruction."
                    }
                ],
                "general_notes": ["Any overall notes about music, color grading, or flow."],
                "unclear_parts": ["List any parts of the transcript that were ambiguous or need clarification."]
            }
        `;

        const geminiResult = await model.generateContent(prompt);
        const responseText = geminiResult.response.text();

        // Extract JSON (Gemini sometimes wraps in markdown blocks)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const parsedInstructions = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

        // 3. Update Supabase
        const { error: updateError } = await supabaseAdmin
            .from("projects")
            .update({
                voice_transcript: transcript,
                brief_language: language,
                parsed_instructions: parsedInstructions,
                updated_at: new Date().toISOString()
            })
            .eq("id", project_id);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, transcript, parsedInstructions });

    } catch (error) {
        console.error("[API Error]:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
