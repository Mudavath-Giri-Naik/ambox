# Supabase Setup Checklist

## Required Supabase Configuration

To ensure audio processing works correctly, verify these settings in your Supabase dashboard:

## 1. Storage Bucket: `project-briefs`

### Create the Bucket (if not exists)
1. Go to Supabase Dashboard → Storage
2. Click "Create a new bucket"
3. Name: `project-briefs`
4. Public bucket: ✅ **YES** (audio files need public URLs)
5. Click "Create bucket"

### Set Bucket Policies
The bucket needs to allow:
- ✅ Public read access (so audio URLs work)
- ✅ Authenticated users can upload
- ✅ Creators can upload to their own project folders

#### Recommended Policy:
```sql
-- Allow public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'project-briefs');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-briefs');

-- Allow users to update their own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'project-briefs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-briefs' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## 2. Database Tables

### `projects` Table
Ensure these columns exist:

```sql
-- Voice brief related columns
voice_brief_url TEXT,           -- URL to audio file in storage
voice_transcript TEXT,          -- Transcribed text from Gemini
parsed_instructions JSONB,      -- Structured instructions from Gemini
brief_language TEXT,            -- Detected language (english, hindi, telugu, mixed)
updated_at TIMESTAMPTZ          -- Last update timestamp
```

### Add columns if missing:
```sql
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS voice_brief_url TEXT,
ADD COLUMN IF NOT EXISTS voice_transcript TEXT,
ADD COLUMN IF NOT EXISTS parsed_instructions JSONB,
ADD COLUMN IF NOT EXISTS brief_language TEXT;
```

## 3. Environment Variables

### In Supabase Dashboard
No additional environment variables needed in Supabase for the Next.js route approach.

### If Using Edge Function (Optional)
If you deploy the Supabase Edge Function, add:
```bash
supabase secrets set GEMINI_API_KEY=AIzaSyAT_9ZXMhdLS3PB3PLWm7kuLL-2WoKXNp4
```

## 4. Verify Setup

### Test Storage Upload
Run this in your browser console (when logged in):
```javascript
const { data, error } = await supabase.storage
  .from('project-briefs')
  .upload('test/test.txt', new Blob(['test']), {
    contentType: 'text/plain'
  });
console.log({ data, error });
```

### Test Public URL
```javascript
const { data } = supabase.storage
  .from('project-briefs')
  .getPublicUrl('test/test.txt');
console.log(data.publicUrl);
```

### Test Database Update
```javascript
const { data, error } = await supabase
  .from('projects')
  .update({
    voice_transcript: 'test',
    brief_language: 'english'
  })
  .eq('id', 'YOUR_PROJECT_ID')
  .select();
console.log({ data, error });
```

## 5. Common Issues & Solutions

### Issue: "Storage bucket not found"
**Solution**: Create the `project-briefs` bucket in Supabase Dashboard → Storage

### Issue: "Permission denied" when uploading
**Solution**: 
1. Make sure bucket is public
2. Check storage policies allow authenticated uploads
3. Verify user is logged in

### Issue: "Public URL returns 404"
**Solution**: 
1. Verify bucket is set to public
2. Check file was actually uploaded
3. Wait a few seconds for CDN propagation

### Issue: "Database update fails"
**Solution**:
1. Check columns exist in `projects` table
2. Verify user has permission to update projects
3. Check RLS (Row Level Security) policies

## 6. Row Level Security (RLS) Policies

Ensure your `projects` table has appropriate RLS policies:

```sql
-- Creators can update their own projects
CREATE POLICY "Creators can update own projects"
ON projects FOR UPDATE
TO authenticated
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

-- Creators can read their own projects
CREATE POLICY "Creators can read own projects"
ON projects FOR SELECT
TO authenticated
USING (creator_id = auth.uid() OR editor_id = auth.uid());
```

## Quick Verification Checklist

- [ ] Storage bucket `project-briefs` exists
- [ ] Bucket is set to public
- [ ] Storage policies allow authenticated uploads
- [ ] `projects` table has voice brief columns
- [ ] RLS policies allow creators to update projects
- [ ] Environment variables set in `.env.local`
- [ ] Development server restarted after env changes

## Testing End-to-End

1. Start dev server: `npm run dev`
2. Login as a creator
3. Go to Creator Dashboard
4. Click "New Project"
5. Record a voice brief
6. Create the project
7. Check browser console for success
8. Verify in Supabase:
   - Storage → `project-briefs` → Should see audio file
   - Table Editor → `projects` → Should see transcript

---

**Status**: Follow this checklist to ensure Supabase is properly configured for audio processing.
