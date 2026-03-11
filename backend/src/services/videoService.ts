/**
 * Video Generation Service
 * Uses Pixverse API for AI video generation
 * Videos are stored permanently in Supabase Storage
 */
import { createClient } from '@supabase/supabase-js';
import pool from '../config/database';
import { env } from '../config/env';

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

function buildPrompt(data: VideoPromptData): string {
  const parts = [`Short social media video about: "${data.tema}".`];
  if (data.estilo) parts.push(`Visual style: ${data.estilo}.`);
  if (data.tom) parts.push(`Tone: ${data.tom}.`);
  if (data.publico) parts.push(`Target audience: ${data.publico}.`);
  if (data.elementos) parts.push(`Key elements: ${data.elementos}.`);
  if (data.cta) parts.push(`Call to action: ${data.cta}.`);
  parts.push('Vertical format 9:16, high quality, engaging.');
  return parts.join(' ');
}

async function uploadToSupabase(videoUrl: string, userId: number): Promise<string> {
  if (!env.supabase.url || !env.supabase.serviceRoleKey) return videoUrl;

  try {
    const res = await fetch(videoUrl);
    if (!res.ok) return videoUrl;
    const videoBytes = await res.arrayBuffer();

    const supabase = createClient(env.supabase.url, env.supabase.serviceRoleKey);
    const filename = `${userId}/${Date.now()}.mp4`;

    const { error } = await supabase.storage
      .from('videos')
      .upload(filename, videoBytes, { contentType: 'video/mp4', upsert: false });

    if (error) return videoUrl;

    const { data } = supabase.storage.from('videos').getPublicUrl(filename);
    return data.publicUrl;
  } catch {
    return videoUrl;
  }
}

async function generateWithPixverse(prompt: string): Promise<string> {
  const headers = {
    'API-KEY': env.pixverse.apiKey,
    'Content-Type': 'application/json',
    'Ai-trial-code': 'AIWEB03',
  };

  // Create text-to-video job
  const createRes = await fetch('https://api-sg.pixverse.ai/openapi/v2/video/text2video/create', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt,
      model: 'v4',
      quality: 'standard',
      duration: 5,
      aspect_ratio: '9:16',
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

  // Poll status up to 10 minutes (120 attempts × 5s)
  for (let attempt = 0; attempt < 120; attempt++) {
    await new Promise((r) => setTimeout(r, 5000));

    const statusRes = await fetch(`https://api-sg.pixverse.ai/openapi/v2/video/result/${videoId}`, {
      headers,
    });

    if (!statusRes.ok) continue;

    const statusData = await statusRes.json() as any;
    if (statusData.ErrCode !== 0) continue;

    const resp = statusData.Resp;
    const status = resp?.status;

    if (status === 'success' && resp?.video_url) {
      return resp.video_url;
    }
    if (status === 'failed') {
      throw new Error(`Pixverse generation failed: ${resp?.err_msg || 'Unknown error'}`);
    }
    // status generating/waiting → keep polling
  }

  throw new Error('Pixverse: timeout waiting for video generation');
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
    const prompt = buildPrompt(data);
    await pool.query(`UPDATE video_jobs SET status='processing', updated_at=NOW() WHERE id=$1`, [jobId]);

    try {
      const pixverseUrl = await generateWithPixverse(prompt);

      // Upload to Supabase Storage for permanent hosting
      const videoUrl = await uploadToSupabase(pixverseUrl, usuarioId);

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
