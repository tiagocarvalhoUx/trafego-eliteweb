/**
 * Video Generation Service
 * Integrates with Google Veo 2 API for AI video generation
 */
import axios from 'axios';
import pool from '../config/database';
import { env } from '../config/env';

const VEO_MODEL = 'veo-2.0-generate-001';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

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
  const parts = [
    `Crie um vídeo curto (até 60 segundos) para redes sociais com o seguinte tema: "${data.tema}".`,
  ];
  if (data.estilo) parts.push(`Estilo Visual: ${data.estilo}.`);
  if (data.tom) parts.push(`Tom: ${data.tom}.`);
  if (data.publico) parts.push(`Público-alvo: ${data.publico}.`);
  if (data.elementos) parts.push(`Elementos Chave: ${data.elementos}.`);
  if (data.musica) parts.push(`Música de Fundo: ${data.musica}.`);
  if (data.cta) parts.push(`Chamada para Ação: ${data.cta}.`);
  if (data.plataformas) parts.push(`Plataformas de Destino: ${data.plataformas}.`);
  return parts.join(' ');
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

  async startGeneration(jobId: number, data: VideoPromptData): Promise<void> {
    const prompt = buildPrompt(data);

    await pool.query(`UPDATE video_jobs SET status='processing', updated_at=NOW() WHERE id=$1`, [jobId]);

    try {
      const response = await axios.post(
        `${GEMINI_BASE}/models/${VEO_MODEL}:predictLongRunning?key=${env.google.apiKey}`,
        {
          instances: [{ prompt }],
          parameters: {
            aspectRatio: '9:16',
            durationSeconds: 8,
            sampleCount: 1,
          },
        }
      );

      const operationName: string = response.data.name;
      await pool.query(
        `UPDATE video_jobs SET google_operation_id=$1, updated_at=NOW() WHERE id=$2`,
        [operationName, jobId]
      );

      // Poll in background
      videoService.pollOperation(jobId, operationName).catch(console.error);
    } catch (error: any) {
      const msg = error?.response?.data?.error?.message || error?.message || 'Unknown error';
      await pool.query(
        `UPDATE video_jobs SET status='failed', error_msg=$1, updated_at=NOW() WHERE id=$2`,
        [msg, jobId]
      );
    }
  },

  async pollOperation(jobId: number, operationName: string): Promise<void> {
    const maxAttempts = 30;
    const delayMs = 10000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, delayMs));

      try {
        const { data } = await axios.get(
          `${GEMINI_BASE}/${operationName}?key=${env.google.apiKey}`
        );

        if (data.done) {
          if (data.error) {
            await pool.query(
              `UPDATE video_jobs SET status='failed', error_msg=$1, updated_at=NOW() WHERE id=$2`,
              [data.error.message, jobId]
            );
          } else {
            const videoUrl: string =
              data.response?.predictions?.[0]?.bytesBase64Encoded
                ? `data:video/mp4;base64,${data.response.predictions[0].bytesBase64Encoded}`
                : data.response?.predictions?.[0]?.mimeType
                ? data.response.predictions[0].uri
                : '';

            await pool.query(
              `UPDATE video_jobs SET status='done', video_url=$1, updated_at=NOW() WHERE id=$2`,
              [videoUrl, jobId]
            );
          }
          return;
        }
      } catch (err) {
        console.error(`[videoService] Poll error for job ${jobId}:`, err);
      }
    }

    await pool.query(
      `UPDATE video_jobs SET status='failed', error_msg='Timeout: video generation took too long', updated_at=NOW() WHERE id=$1`,
      [jobId]
    );
  },

  async getJobs(usuarioId: number): Promise<any[]> {
    const { rows } = await pool.query(
      `SELECT id, prompt_tema, prompt_estilo, prompt_tom, plataformas,
              status, video_url, thumbnail_url, publicado_instagram, publicado_tiktok,
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
