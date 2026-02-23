# Supabase Edge Function Deployment Guide

## Overview
This guide will help you deploy the Gemini-powered audio transcription edge function to Supabase.

## Prerequisites
- Supabase CLI installed ([Install Guide](https://supabase.com/docs/guides/cli))
- Supabase project created
- Gemini API key (already in your .env.local)

## Step 1: Install Supabase CLI

```bash
# Using npm
npm install -g supabase

# Or using Homebrew (macOS)
brew install supabase/tap/supabase
```

## Step 2: Login to Supabase

```bash
supabase login
```

## Step 3: Link Your Project

```bash
# Get your project reference ID from Supabase dashboard URL
# Example: https://supabase.com/dashboard/project/YOUR_PROJECT_REF

supabase link --project-ref YOUR_PROJECT_REF
```

## Step 4: Create Function Directory Structure

```bash
# Create the functions directory if it doesn't exist
mkdir -p supabase/functions/transcribe-brief

# Copy the edge function code
# Copy the content from supabase-edge-function/transcribe-brief-index.ts 
# to supabase/functions/transcribe-brief/index.ts
```

## Step 5: Set Environment Variables

Set your Gemini API key as a secret in Supabase:

```bash
supabase secrets set GEMINI_API_KEY=AIzaSyAT_9ZXMhdLS3PB3PLWm7kuLL-2WoKXNp4
```

## Step 6: Deploy the Function

```bash
supabase functions deploy transcribe-brief
```

## Step 7: Verify Deployment

After deployment, you'll get a function URL like:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/transcribe-brief
```

## Step 8: Update Your Next.js App (if needed)

Your Next.js app at `app/api/transcribe-brief/route.js` already handles transcription locally using Gemini. 

If you want to use the Supabase Edge Function instead, you would need to:

1. Call the edge function from your frontend
2. Pass the audio_url and project_id
3. The edge function will handle transcription and database updates

## Testing the Edge Function

You can test it using curl:

```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/transcribe-brief' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "project_id": "test-project-id",
    "audio_url": "https://your-audio-url.com/audio.webm"
  }'
```

## Important Notes

1. **Current Setup**: Your app currently uses the Next.js API route (`app/api/transcribe-brief/route.js`) which already works with Gemini. This is perfectly fine!

2. **Edge Function vs Next.js Route**: 
   - Edge Function: Runs on Supabase servers, good for serverless architecture
   - Next.js Route: Runs on your Next.js server, easier to debug and deploy with your app

3. **Recommendation**: Since your Next.js route already works with Gemini, you may not need the edge function unless you want to:
   - Offload processing from your Next.js server
   - Use Supabase's serverless infrastructure
   - Have a separate microservice for audio processing

## Troubleshooting

### Function not deploying
- Make sure you're logged in: `supabase login`
- Check your project is linked: `supabase projects list`

### API key not working
- Verify the secret is set: `supabase secrets list`
- Make sure the key is correct in Supabase dashboard

### CORS errors
- The function includes CORS headers for all origins
- If you need to restrict, modify the `corsHeaders` in the function

## Alternative: Keep Using Next.js Route

Your current setup with `app/api/transcribe-brief/route.js` is already working with Gemini. You can continue using it without deploying to Supabase Edge Functions. The Next.js route is:

- ✅ Already integrated with Gemini
- ✅ Easier to debug and maintain
- ✅ Deploys with your Next.js app
- ✅ No additional Supabase configuration needed

The edge function is provided as an alternative if you prefer serverless architecture.
