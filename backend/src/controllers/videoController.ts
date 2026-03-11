import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { videoService } from '../services/videoService';

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

      // Start generation in background
      videoService.startGeneration(jobId, { tema, estilo, tom, publico, elementos, musica, cta, plataformas })
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
};
