# Talent portfolio media — setup and demo data

## One-time Supabase setup

The uploader writes to a Storage bucket named `talent-media`. Create it once:

1. Supabase Dashboard → **Storage** → **New bucket**
2. Name: `talent-media`
3. **Public bucket: on** — portfolio images are served straight from their URL.
   (If you'd rather keep them private, the bucket can stay private and
   `getPublicUrl` in `src/app/api/media/[ownerType]/[ownerId]/route.ts` swapped for
   `createSignedUrl`. That's a small change, but every render then costs a
   signing round-trip.)
4. Run `supabase/schema.sql` if you haven't since this feature landed — it adds
   the `suppliers` and `media` tables, the one-thumbnail-per-owner indexes, and
   the 10-item cap trigger. If an older `talent_media` table exists its rows are
   copied across and the table is dropped. The file is safe to re-run.

No storage policies are needed: uploads go through a signed URL that the server
issues only after checking the caller's role and the item count, and the service
role does all the writing.

## Limits

| | |
|---|---|
| Items per record | **10** (photos and videos combined) |
| Image types | JPEG, PNG, WebP, AVIF — up to 15 MB |
| Video types | MP4, WebM, MOV — up to 200 MB |

The cap is enforced in three places: the UI disables the drop zone, the
`/media/sign` route refuses to authorise an 11th upload, and a Postgres trigger
rejects the insert even if both of those are bypassed.

Media attaches to **talent**, **suppliers** and **client deals**. One `media`
table serves all three, with a nullable foreign key per owner and a check that
exactly one is set — so `on delete cascade` still cleans up when the owner goes,
which a loose `(owner_type, owner_id)` pair could not do.

## Demo images

`npm run db:seed` gives each demo talent 4–7 portfolio items using
[DiceBear](https://www.dicebear.com) avatar URLs. These are **generated
illustrations, not photographs** — deliberately so:

- They're already allow-listed in `next.config.js`, cost nothing, and never
  rate-limit.
- They're deterministic per talent, so re-seeding doesn't churn.
- They're unmistakably synthetic, so nobody mistakes demo data for a real roster.

Stock photos of real people were **not** used. Labelling a real, identifiable
person as a talent on an agency roster misrepresents them, regardless of the
photo's licence.

## Replacing them with generated photos

To put photorealistic images in, generate them locally and upload through the
app's own Portfolio tab (Talent → *a talent* → **Portfolio**). Drag in up to 10
files at once.

[Fooocus](https://github.com/lllyasviel/Fooocus) is a good fit — it's an SDXL
front-end that runs on your own machine:

```bash
git clone https://github.com/lllyasviel/Fooocus.git
cd Fooocus
python entry_with_update.py          # first run downloads the SDXL checkpoints
```

Notes for this use case:

- It needs a **GPU** (roughly 4 GB VRAM minimum, 8 GB+ comfortable) and about
  10 GB of disk for the models. CPU-only works but takes minutes per image.
- Use a **portrait aspect ratio** — 896×1152 or 832×1216 — so images fit the
  gallery's 3:4 tiles and a comp card layout without awkward cropping.
- Output lands in `Fooocus/outputs/<date>/` as PNG, which the uploader accepts
  directly. A 1024-ish SDXL PNG is 1–2 MB, well inside the 15 MB image limit.
- Generate 4–6 per talent with a consistent seed and prompt per person, so one
  talent's portfolio looks like the same individual across shots.

Any other generator works the same way — the app only cares about the file.
