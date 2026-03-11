/**
 * Video Generation Service
 * Integrates with Google Veo 3 via Gemini API
 */
import { GoogleGenAI } from '@google/genai';
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
  parts.push('Vertical format 9:16, high quality, engaging, up to 8 seconds.');
  return parts.join(' ');
}

async function uploadToSupabase(videoBytes: ArrayBuffer, userId: number): Promise<string> {
  const supabase = createClient(env.supabase.url, env.supabase.serviceRoleKey);
  const filename = `${userId}/${Date.now()}.mp4`;

  const { error } = await supabase.storage
    .from('videos')
    .upload(filename, videoBytes, { contentType: 'video/mp4', upsert: false });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data } = supabase.storage.from('videos').getPublicUrl(filename);
  return data.publicUrl;
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
      const ai = new GoogleGenAI({ apiKey: env.google.apiKey });

      // Start video generation
      let operation = await (ai.models as any).generateVideos({
        model: 'veo-3.0-generate-preview',
        prompt,
        config: { aspectRatio: '9:16', numberOfVideos: 1 },
      });

      // Poll every 15 seconds until done
      while (!operation.done) {
        await new Promise((r) => setTimeout(r, 15000));
        operation = await (ai.operations as any).getVideosOperation({ operation });
      }

      const videoUri: string = operation.response?.generatedSamples?.[0]?.video?.uri;
      if (!videoUri) throw new Error('No video URI in response');

      // Download video from Google
      const res = await fetch(`${videoUri}?key=${env.google.apiKey}`);
      if (!res.ok) throw new Error(`Failed to download video: ${res.status}`);
      const videoBytes = await res.arrayBuffer();

      // Upload to Supabase Storage
      const publicUrl = await uploadToSupabase(videoBytes, usuarioId);

      await pool.query(
        `UPDATE video_jobs SET status='done', video_url=$1, updated_at=NOW() WHERE id=$2`,
        [publicUrl, jobId]
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
