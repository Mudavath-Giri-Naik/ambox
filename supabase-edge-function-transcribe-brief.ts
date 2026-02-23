// Supabase Edge Function: transcribe-brief
// Deploy this to: supabase/functions/transcribe-brief/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('transcribe-brief function called')
    const { project_id, audio_url } = await req.json()
    console.log('Received:', { project_id, audio_url })

    if (!project_id || !audio_url) {
      return new Response(
        JSON.stringify({ error: 'Missing project_id or audio_url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if Gemini key exists
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not set')
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Download audio from Supabase Storage
    console.log('Downloading audio from:', audio_url)
    const audioResponse = await fetch(audio_url)
    if (!audioResponse.ok) {
      console.error('Audio download failed:', audioResponse.status)
      throw new Error('Failed to download audio file')
    }

    const audioBuffer = await audioResponse.arrayBuffer()
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))
    const mimeType = audioResponse.headers.get('content-type') || 'audio/webm'
    console.log('Audio downloaded, size:', audioBuffer.byteLength, 'mime:', mimeType)

    // 2. Transcribe and parse with Gemini in a single call
    console.log('Calling Gemini API...')
    
    const prompt = `You are an expert video editing consultant. Listen to this voice brief recording and:
1. Transcribe it accurately (may be in Telugu, Hindi, English, or mixed).
2. Extract structured editing instructions from the transcript.

Respond ONLY with a valid JSON object in exactly this format (no markdown, no extra text):
{
    "transcript": "The full verbatim transcript of the audio.",
    "language": "detected language (e.g. english, hindi, telugu, mixed)",
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
}`

    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + GEMINI_API_KEY,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: audioBase64
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          }
        })
      }
    )

    if (!geminiResponse.ok) {
      const error = await geminiResponse.text()
      console.error('Gemini error:', error)
      throw new Error(`Gemini API error: ${error}`)
    }

    const geminiData = await geminiResponse.json()
    console.log('Gemini response received')
    
    // Extract text from Gemini response
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
    console.log('Response text:', responseText)

    // Parse JSON from response (Gemini sometimes wraps in markdown)
    let parsed
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (e) {
      console.error('Failed to parse Gemini response:', responseText)
      // Fallback structure
      parsed = {
        transcript: responseText,
        language: "unknown",
        summary: "Could not parse instructions automatically",
        instructions: [],
        general_notes: [responseText],
        unclear_parts: ["Full transcript needs manual review"]
      }
    }

    const transcript = parsed.transcript || responseText
    const language = parsed.language || 'unknown'

    // 3. Update project in database
    console.log('Updating database...')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        voice_transcript: transcript,
        parsed_instructions: {
          summary: parsed.summary,
          instructions: parsed.instructions,
          general_notes: parsed.general_notes,
          unclear_parts: parsed.unclear_parts
        },
        brief_language: language,
        updated_at: new Date().toISOString()
      })
      .eq('id', project_id)

    if (updateError) {
      console.error('Database update error:', updateError)
      throw new Error(`Database update error: ${updateError.message}`)
    }

    console.log('Success!')
    return new Response(
      JSON.stringify({ 
        success: true, 
        transcript, 
        parsed: {
          summary: parsed.summary,
          instructions: parsed.instructions,
          general_notes: parsed.general_notes,
          unclear_parts: parsed.unclear_parts
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
