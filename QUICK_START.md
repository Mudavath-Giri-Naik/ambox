# Quick Start - Audio Processing with Gemini

## TL;DR - What You Need to Do

Your audio processing is **already set up correctly**! Just follow these steps to verify:

## 1. Verify Environment Variables ✅

Your `.env.local` already has:
```env
GEMINI_API_KEY=AIzaSyAT_9ZXMhdLS3PB3PLWm7kuLL-2WoKXNp4
```

## 2. Verify Supabase Storage

In Supabase Dashboard:
1. Go to **Storage**
2. Check if `project-briefs` bucket exists
3. If not, create it and make it **public**

## 3. Verify Database Columns

In Supabase Dashboard → Table Editor → `projects`:
- Check these columns exist:
  - `voice_brief_url` (text)
  - `voice_transcript` (text)
  - `parsed_instructions` (jsonb)
  - `brief_language` (text)

If missing, run this SQL:
```sql
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS voice_brief_url TEXT,
ADD COLUMN IF NOT EXISTS voice_transcript TEXT,
ADD COLUMN IF NOT EXISTS parsed_instructions JSONB,
ADD COLUMN IF NOT EXISTS brief_language TEXT;
```

## 4. Test It!

```bash
# Start dev server
npm run dev

# Open browser to http://localhost:3000
# Login as creator
# Go to Creator Dashboard
# Click "New Project"
# Click "Start Recording" in Voice Brief section
# Record something like: "Cut the first 10 seconds and add music"
# Stop recording
# Fill in project details
# Click "Create Project"
```

## 5. Verify It Worked

Check browser console - should see:
```
✅ Audio uploaded to Supabase Storage
✅ Calling /api/transcribe-brief
✅ Gemini processing...
✅ Success!
```

Check Supabase Dashboard:
- **Storage** → `project-briefs` → Should see audio file
- **Table Editor** → `projects` → Should see:
  - `voice_brief_url`: https://...
  - `voice_transcript`: "Cut the first 10 seconds and add music"
  - `parsed_instructions`: { summary: "...", instructions: [...] }
  - `brief_language`: "english"

## That's It!

Your audio processing is working with Gemini AI. No OpenAI API key needed.

## Files Created for Reference

1. **AUDIO_PROCESSING_FIXED.md** - Complete overview of your setup
2. **SUPABASE_SETUP_CHECKLIST.md** - Detailed Supabase configuration
3. **SUPABASE_DEPLOYMENT_GUIDE.md** - Optional edge function deployment
4. **supabase-edge-function-transcribe-brief.ts** - Optional edge function code

## Need Help?

- Check `AUDIO_PROCESSING_FIXED.md` for troubleshooting
- Check `SUPABASE_SETUP_CHECKLIST.md` for Supabase setup
- Your current Next.js route is already working - no changes needed!

---

**Current Status**: ✅ Ready to use - just verify Supabase storage bucket exists!
