import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { videoService } from '../services/videoService';
import multer from 'multer';

export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export function handleMulterError(err: any, _req: AuthRequest, res: Response, next: NextFunction): void {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ success: false, message: 'Arquivo muito grande.' });
    return;
  }
  next(err);
}

export const videoController = {
  async listJobs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const jobs = await videoService.getJobs(req.userId!);
      res.json({ success: true, data: jobs });
    } catch (error) {
      console.error('List video jobs error:', error);
      res.status(500).json({ success: false, message: 'Erro ao listar vídeos' });
    }
  },

  async createJob(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tema, estilo, tom, publico, elementos, musica, cta, plataformas } = req.body;
      if (!tema) {
        res.status(400).json({ success: false, message: 'O tema do vídeo é obrigatório' });
        return;
      }
      const jobId = await videoService.createJob(req.userId!, {
        tema, estilo, tom, publico, elementos, musica, cta, plataformas,
      });
      videoService.startGeneration(jobId, { tema, estilo, tom, publico, elementos, musica, cta, plataformas }, req.userId!)
        .catch(console.error);
      res.status(201).json({
        success: true,
        message: 'Geração de vídeo iniciada! Aguarde alguns minutos.',
        data: { jobId },
      });
    } catch (error) {
      console.error('Create video job error:', error);
      res.status(500).json({ success: false, message: 'Erro ao iniciar geração de vídeo' });
    }
  },

  // Step 1: return a Supabase signed upload URL — no file touches the backend
  async getSignedUploadUrl(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { filename } = req.body;
      if (!filename) {
        res.status(400).json({ success: false, message: 'filename obrigatório' });
        return;
      }
      const result = await videoService.createSignedUploadUrl(req.userId!, filename);
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Signed URL error:', error);
      res.status(500).json({ success: false, message: error?.message || 'Erro ao gerar URL de upload' });
    }
  },

  // Step 2: browser finished uploading to Supabase, save job to DB
  async completeUpload(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { path: storagePath, caption } = req.body;
      if (!storagePath) {
        res.status(400).json({ success: false, message: 'path obrigatório' });
        return;
      }
      const jobId = await videoService.saveUploadedVideo(storagePath, caption || '', req.userId!);
      res.status(201).json({ success: true, message: 'Vídeo salvo com sucesso!', data: { jobId } });
    } catch (error: any) {
      console.error('Complete upload error:', error);
      res.status(500).json({ success: false, message: error?.message || 'Erro ao salvar vídeo' });
    }
  },

  async getJob(req: AuthRequest, res: Response): Promise<void> {
    try {
      const job = await videoService.getJob(parseInt(req.params.id), req.userId!);
      if (!job) {
        res.status(404).json({ success: false, message: 'Vídeo não encontrado' });
        return;
      }
      res.json({ success: true, data: job });
    } catch (error) {
      console.error('Get video job error:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar vídeo' });
    }
  },

  async deleteJob(req: AuthRequest, res: Response): Promise<void> {
    try {
      await videoService.deleteJob(parseInt(req.params.id), req.userId!);
      res.json({ success: true, message: 'Vídeo removido' });
    } catch (error) {
      console.error('Delete video job error:', error);
      res.status(500).json({ success: false, message: 'Erro ao remover vídeo' });
    }
  },

  async publishToInstagram(req: AuthRequest, res: Response): Promise<void> {
    try {
      const jobId = parseInt(req.params.id);
      const caption = (req.body.caption as string) || '';
      await videoService.publishToInstagram(jobId, req.userId!, caption);
      res.json({ success: true, message: 'Publicado no Instagram com sucesso!' });
    } catch (error: any) {
      console.error('Publish to Instagram error:', error?.response?.data || error);
      res.status(500).json({ success: false, message: error?.message || 'Erro ao publicar no Instagram' });
    }
  },

  async publishToTikTok(req: AuthRequest, res: Response): Promise<void> {
    try {
      const jobId = parseInt(req.params.id);
      const caption = (req.body.caption as string) || '';
      await videoService.publishToTikTok(jobId, req.userId!, caption);
      res.json({ success: true, message: 'Publicado no TikTok com sucesso!' });
    } catch (error: any) {
      console.error('Publish to TikTok error:', error?.response?.data || error);
      res.status(500).json({ success: false, message: error?.message || 'Erro ao publicar no TikTok' });
    }
  },
};
