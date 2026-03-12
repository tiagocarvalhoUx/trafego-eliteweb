/**
 * Video Generation Service
 * Pipeline: Pixverse (8s video) + ElevenLabs (TTS voice) + ffmpeg (merge) + Supabase Storage
 */
import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import pool from '../config/database';
import { env } from '../config/env';

const execAsync = promisify(exec);

export interface VideoPromptData {
  tema: string;
  estilo?: string;
  tom?: string;
  publico?: string;
  elementos?: string;
  musica?: string;
  cta?: string;
  plataformas?: string;
}

function buildVideoPrompt(data: VideoPromptData): string {
  const parts = [`Short social media video about: "${data.tema}".`];
  if (data.estilo) parts.push(`Visual style: ${data.estilo}.`);
  if (data.tom) parts.push(`Tone: ${data.tom}.`);
  if (data.publico) parts.push(`Target audience: ${data.publico}.`);
  if (data.elementos) parts.push(`Key elements: ${data.elementos}.`);
  if (data.cta) parts.push(`Call to action: ${data.cta}.`);
  parts.push('Vertical format 9:16, high quality, engaging.');
  return parts.join(' ');
}

function buildNarration(data: VideoPromptData): string {
  const parts: string[] = [];
  if (data.tema) parts.push(data.tema);
  if (data.cta) parts.push(data.cta);
  return parts.join('. ') || data.tema;
}

async function generateWithPixverse(prompt: string): Promise<string> {
  const headers = {
    'API-KEY': env.pixverse.apiKey,
    'Content-Type': 'application/json',
    'Ai-trace-id': crypto.randomUUID(),
  };

  const createRes = await fetch('https://app-api.pixverse.ai/openapi/v2/video/text/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt,
      model: 'v4.5',
      quality: '540p',
      duration: 8,
      aspect_ratio: '9:16',
      motion_mode: 'normal',
      water_mark: false,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Pixverse create error ${createRes.status}: ${err}`);
  }

  const createData = await createRes.json() as any;
  if (createData.ErrCode !== 0) {
    throw new Error(`Pixverse error: ${createData.ErrMsg || JSON.stringify(createData)}`);
  }

  const videoId = createData.Resp?.video_id;
  if (!videoId) {
    throw new Error(`Pixverse: no video_id returned. Response: ${JSON.stringify(createData)}`);
  }

  // Poll status — 1=success, 5=waiting, 7=moderation fail, 8=failed
  for (let attempt = 0; attempt < 120; attempt++) {
    await new Promise((r) => setTimeout(r, 5000));

    const statusRes = await fetch(`https://app-api.pixverse.ai/openapi/v2/video/result/${videoId}`, {
      headers: { 'API-KEY': env.pixverse.apiKey, 'Ai-trace-id': crypto.randomUUID() },
    });

    if (!statusRes.ok) continue;

    const statusData = await statusRes.json() as any;
    if (statusData.ErrCode !== 0) continue;

    const resp = statusData.Resp;
    const status = resp?.status;

    if (status === 1 && resp?.url) return resp.url;
    if (status === 7) throw new Error('Pixverse: content moderation failure');
    if (status === 8) throw new Error('Pixverse: generation failed');
  }

  throw new Error('Pixverse: timeout waiting for video generation');
}

async function generateVoiceWithElevenLabs(text: string): Promise<Buffer> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${env.elevenlabs.voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': env.elevenlabs.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs TTS error ${res.status}: ${err}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

async function mergeVideoAndAudio(videoUrl: string, audioBuffer: Buffer): Promise<Buffer> {
  const id = crypto.randomUUID();
  const videoPath = join(tmpdir(), `${id}_video.mp4`);
  const audioPath = join(tmpdir(), `${id}_audio.mp3`);
  const outputPath = join(tmpdir(), `${id}_output.mp4`);

  try {
    // Download video
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`Failed to download video: ${videoRes.status}`);
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

    // Write temp files
    await writeFile(videoPath, videoBuffer);
    await writeFile(audioPath, audioBuffer);

    // Merge with ffmpeg: loop/trim audio to fit video duration
    await execAsync(
      `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -shortest "${outputPath}"`
    );

    const result = await readFile(outputPath);
    return result;
  } finally {
    // Cleanup temp files
    await unlink(videoPath).catch(() => {});
    await unlink(audioPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

async function uploadToSupabase(data: Buffer, userId: number): Promise<string> {
  if (!env.supabase.url || !env.supabase.serviceRoleKey) {
    throw new Error('Supabase not configured');
  }

  const supabase = createClient(env.supabase.url, env.supabase.serviceRoleKey);
  const filename = `${userId}/${Date.now()}.mp4`;

  const { error } = await supabase.storage
    .from('videos')
    .upload(filename, data, { contentType: 'video/mp4', upsert: false });

  if (error) throw new Error(`Supabase upload error: ${error.message}`);

  const { data: urlData } = supabase.storage.from('videos').getPublicUrl(filename);
  return urlData.publicUrl;
}

export const videoService = {
  async createJob(usuarioId: number, data: VideoPromptData): Promise<number> {
    const { rows } = await pool.query(
      `INSERT INTO video_jobs
        (usuario_id, prompt_tema, prompt_estilo, prompt_tom, prompt_publico,
         prompt_elementos, prompt_musica, prompt_cta, plataformas, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending')
       RETURNING id`,
      [usuarioId, data.tema, data.estilo, data.tom, data.publico,
       data.elementos, data.musica, data.cta, data.plataformas]
    );
    return rows[0].id;
  },

  async startGeneration(jobId: number, data: VideoPromptData, usuarioId: number): Promise<void> {
    const videoPrompt = buildVideoPrompt(data);
    const narrationText = buildNarration(data);

    await pool.query(`UPDATE video_jobs SET status='processing', updated_at=NOW() WHERE id=$1`, [jobId]);

    try {
      // Step 1: Generate video (Pixverse) and voice (ElevenLabs) in parallel
      const [pixverseUrl, audioBuffer] = await Promise.all([
        generateWithPixverse(videoPrompt),
        env.elevenlabs.apiKey
          ? generateVoiceWithElevenLabs(narrationText)
          : Promise.resolve(null as any),
      ]);

      let finalVideoBuffer: Buffer;

      if (audioBuffer) {
        // Step 2: Merge video + audio with ffmpeg
        finalVideoBuffer = await mergeVideoAndAudio(pixverseUrl, audioBuffer);
      } else {
        // No ElevenLabs key — download video as-is
        const res = await fetch(pixverseUrl);
        finalVideoBuffer = Buffer.from(await res.arrayBuffer());
      }

      // Step 3: Upload merged video to Supabase Storage
      const videoUrl = await uploadToSupabase(finalVideoBuffer, usuarioId);

      await pool.query(
        `UPDATE video_jobs SET status='done', video_url=$1, updated_at=NOW() WHERE id=$2`,
        [videoUrl, jobId]
      );
    } catch (error: any) {
      const msg = error?.message || 'Unknown error';
      await pool.query(
        `UPDATE video_jobs SET status='failed', error_msg=$1, updated_at=NOW() WHERE id=$2`,
        [msg, jobId]
      );
    }
  },

  async getJobs(usuarioId: number): Promise<any[]> {
    const { rows } = await pool.query(
      `SELECT id, prompt_tema, prompt_estilo, prompt_tom, plataformas,
              status, video_url, publicado_instagram, publicado_tiktok,
              error_msg, created_at
       FROM video_jobs WHERE usuario_id=$1 ORDER BY created_at DESC`,
      [usuarioId]
    );
    return rows;
  },

  async getJob(jobId: number, usuarioId: number): Promise<any | null> {
    const { rows } = await pool.query(
      `SELECT * FROM video_jobs WHERE id=$1 AND usuario_id=$2`,
      [jobId, usuarioId]
    );
    return rows[0] || null;
  },

  async deleteJob(jobId: number, usuarioId: number): Promise<void> {
    await pool.query(`DELETE FROM video_jobs WHERE id=$1 AND usuario_id=$2`, [jobId, usuarioId]);
  },
};
