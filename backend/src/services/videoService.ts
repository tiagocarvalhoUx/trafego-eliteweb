/**
 * Video Generation Service
 * Pipeline: Pixverse (8s video) + Supabase Storage + Instagram Reel auto-publish
 */
import { createClient } from '@supabase/supabase-js';
import pool from '../config/database';
import { env } from '../config/env';
import { instagramService } from './instagramService';

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

function buildCaption(data: VideoPromptData): string {
  const lines: string[] = [];
  if (data.tema) lines.push(data.tema);
  if (data.cta) lines.push(data.cta);

  const hashtags = [
    '#reels', '#viral', '#trending', '#socialmedia', '#marketing',
    '#digitalmarketing', '#empreendedorismo', '#negociosdigitais',
    '#conteudo', '#dicas', '#motivacao', '#sucesso', '#brasil',
    '#marketingdigital', '#crescimento',
  ].join(' ');

  return `${lines.join('\n\n')}\n\n${hashtags}`;
}

async function generateWithPixverse(prompt: string): Promise<string> {
  const payload = {
    prompt,
    model: 'v3.5',
    quality: '540p',
    duration: 5,
  };

  console.log('[Pixverse] Sending request:', JSON.stringify(payload));

  const createRes = await fetch('https://app-api.pixverse.ai/openapi/v2/video/text/generate', {
    method: 'POST',
    headers: {
      'API-KEY': env.pixverse.apiKey,
      'Content-Type': 'application/json',
      'Ai-trace-id': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
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

  console.log(`[Pixverse] Video ID: ${videoId}, polling status...`);

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

    if (status === 1 && resp?.url) {
      console.log(`[Pixverse] Video ready: ${resp.url}`);
      return resp.url;
    }
    if (status === 7) throw new Error('Pixverse: content moderation failure');
    if (status === 8) throw new Error('Pixverse: generation failed');
  }

  throw new Error('Pixverse: timeout waiting for video generation');
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

async function autoPublishToInstagram(videoUrl: string, caption: string, usuarioId: number, jobId: number): Promise<void> {
  const { rows } = await pool.query(
    `SELECT access_token, conta_id_plataforma FROM contas_sociais
     WHERE usuario_id = $1 AND plataforma = 'instagram' AND ativo = true
     LIMIT 1`,
    [usuarioId]
  );

  if (rows.length === 0) {
    console.log(`[autoPublish] No Instagram account connected for user ${usuarioId}`);
    return;
  }

  const { access_token, conta_id_plataforma } = rows[0];

  try {
    console.log(`[autoPublish] Publishing Reel for job ${jobId} to Instagram...`);
    await instagramService.publishReel(conta_id_plataforma, videoUrl, caption, access_token);

    await pool.query(
      `UPDATE video_jobs SET publicado_instagram = true, updated_at = NOW() WHERE id = $1`,
      [jobId]
    );
    console.log(`[autoPublish] Reel published successfully for job ${jobId}`);
  } catch (error: any) {
    console.error(`[autoPublish] Failed to publish Reel for job ${jobId}:`, error?.response?.data || error?.message || error);
  }
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

    await pool.query(`UPDATE video_jobs SET status='processing', updated_at=NOW() WHERE id=$1`, [jobId]);

    try {
      // Step 1: Generate video with Pixverse
      const pixverseUrl = await generateWithPixverse(videoPrompt);

      // Step 2: Download video
      const res = await fetch(pixverseUrl);
      if (!res.ok) throw new Error(`Failed to download video: ${res.status}`);
      const finalVideoBuffer = Buffer.from(await res.arrayBuffer());

      // Step 3: Upload to Supabase Storage
      const videoUrl = await uploadToSupabase(finalVideoBuffer, usuarioId);

      // Step 4: Generate caption with hashtags
      const caption = buildCaption(data);
      console.log(`[startGeneration] Job ${jobId} done. Video: ${videoUrl}`);

      await pool.query(
        `UPDATE video_jobs SET status='done', video_url=$1, caption=$2, updated_at=NOW() WHERE id=$3`,
        [videoUrl, caption, jobId]
      );

      // Step 5: Auto-publish to Instagram if connected (non-blocking)
      const plataformas = data.plataformas?.toLowerCase() || '';
      if (plataformas.includes('instagram')) {
        autoPublishToInstagram(videoUrl, caption, usuarioId, jobId).catch(console.error);
      }
    } catch (error: any) {
      const msg = error?.message || 'Unknown error';
      console.error(`[startGeneration] Job ${jobId} failed:`, msg);
      await pool.query(
        `UPDATE video_jobs SET status='failed', error_msg=$1, updated_at=NOW() WHERE id=$2`,
        [msg, jobId]
      );
    }
  },

  async getJobs(usuarioId: number): Promise<any[]> {
    const { rows } = await pool.query(
      `SELECT id, prompt_tema, prompt_estilo, prompt_tom, plataformas,
              status, video_url, caption, publicado_instagram, publicado_tiktok,
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
