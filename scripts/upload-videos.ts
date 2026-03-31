/**
 * One-time script to upload gallery videos to Vercel Blob.
 *
 * Prerequisites:
 *   - ffmpeg must be installed (brew install ffmpeg)
 *   - BLOB_READ_WRITE_TOKEN env var must be set
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=<token> bun run scripts/upload-videos.ts
 *
 * What it does:
 *   1. Converts 7 .mov files from ../tattoo-website/public/videos/ to .mp4
 *   2. Extracts a poster thumbnail (JPEG) from each video at the 1-second mark
 *   3. Uploads each .mp4 and poster .jpg to Vercel Blob
 *   4. Prints resulting Blob URLs for copy-paste into src/lib/gallery-videos.ts
 */

import { put } from '@vercel/blob';
import { readFile, mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';

const SOURCE_DIR = '../tattoo-website/public/videos';

const VIDEOS = [
  'christ-crosses-left-arm-sleeve.mov',
  'christ-crosses-right-arm.mov',
  'clock-lion-left-arm.mov',
  'clock-roses.mov',
  'dragonballz-left-arm.mov',
  'praying-hands-left-arm.mov',
  'praying-nun.mov',
];

async function uploadVideos() {
  // Prerequisite check: fail fast with helpful message if ffmpeg is missing
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
  } catch {
    console.error('ERROR: ffmpeg is not installed.');
    console.error('Install it with: brew install ffmpeg');
    console.error('Then re-run this script.');
    process.exit(1);
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error('ERROR: BLOB_READ_WRITE_TOKEN env var is not set.');
    console.error(
      'Get it from: Vercel Dashboard -> Project -> Settings -> Environment Variables'
    );
    console.error(
      'Then run: BLOB_READ_WRITE_TOKEN=<token> bun run scripts/upload-videos.ts'
    );
    process.exit(1);
  }

  // Create temp dir for converted files
  const tempDir = await mkdtemp(join(tmpdir(), 'ink37-videos-'));

  try {
    const results: { name: string; url: string; posterUrl: string }[] = [];

    for (const filename of VIDEOS) {
      const sourcePath = join(SOURCE_DIR, filename);
      const mp4Name = filename.replace('.mov', '.mp4');
      const posterName = filename.replace('.mov', '.jpg');
      const mp4Path = join(tempDir, mp4Name);
      const posterPath = join(tempDir, posterName);

      // Convert .mov to .mp4 (H.264 + AAC)
      // Try fast remux first (-c copy with -movflags +faststart).
      // If codec is already H.264, remux is instant. If not, full transcode.
      console.log(`Converting: ${filename} -> ${mp4Name}`);
      try {
        execSync(
          `ffmpeg -i "${sourcePath}" -c copy -movflags +faststart "${mp4Path}" -y`,
          { stdio: 'pipe' }
        );
      } catch {
        // Remux failed, full transcode with quality constraints
        console.log('  Remux failed, transcoding...');
        execSync(
          `ffmpeg -i "${sourcePath}" -c:v libx264 -c:a aac -crf 23 -preset medium -movflags +faststart "${mp4Path}" -y`,
          { stdio: 'pipe' }
        );
      }

      // Extract poster thumbnail at 1 second
      // -vframes 1 extracts a single frame, -q:v 2 is high quality JPEG
      console.log(`  Extracting poster: ${posterName}`);
      execSync(
        `ffmpeg -i "${mp4Path}" -ss 1 -vframes 1 -q:v 2 "${posterPath}" -y`,
        { stdio: 'pipe' }
      );

      // Upload video to Vercel Blob
      const videoBuffer = await readFile(mp4Path);
      console.log(
        `  Uploading video: ${mp4Name} (${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB)`
      );
      const videoBlob = await put(`gallery-videos/${mp4Name}`, videoBuffer, {
        access: 'public',
        token,
        multipart: true,
        contentType: 'video/mp4',
      });

      // Upload poster to Vercel Blob
      const posterBuffer = await readFile(posterPath);
      console.log(
        `  Uploading poster: ${posterName} (${(posterBuffer.length / 1024).toFixed(0)} KB)`
      );
      const posterBlob = await put(
        `gallery-videos/posters/${posterName}`,
        posterBuffer,
        {
          access: 'public',
          token,
          contentType: 'image/jpeg',
        }
      );

      results.push({
        name: mp4Name,
        url: videoBlob.url,
        posterUrl: posterBlob.url,
      });
      console.log(`  Video URL: ${videoBlob.url}`);
      console.log(`  Poster URL: ${posterBlob.url}`);
    }

    // Print summary for copy-paste into gallery-videos.ts
    console.log(
      '\n--- GALLERY_VIDEOS URLs (update src/lib/gallery-videos.ts) ---'
    );
    console.log(JSON.stringify(results, null, 2));
  } finally {
    // Clean up temp dir
    await rm(tempDir, { recursive: true, force: true });
  }
}

uploadVideos().catch(console.error);
