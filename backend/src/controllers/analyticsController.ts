import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { analyticsService } from '../services/analyticsService';
import { reportService } from '../services/reportService';

export const analyticsController = {
  // GET /api/analytics/dashboard
  async getDashboard(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await analyticsService.getDashboardSummary(req.userId!);
      res.json({ success: true, data });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({ success: false, message: 'Erro ao carregar dashboard' });
    }
  },

  // GET /api/analytics/engagement?days=30
  async getEngagement(req: AuthRequest, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await analyticsService.getEngagementByDay(req.userId!, days);
      res.json({ success: true, data });
    } catch (error) {
      console.error('Engagement error:', error);
      res.status(500).json({ success: false, message: 'Erro ao carregar engajamento' });
    }
  },

  // GET /api/analytics/followers?days=30
  async getFollowers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const data = await analyticsService.getFollowerGrowth(req.userId!, days);
      res.json({ success: true, data });
    } catch (error) {
      console.error('Followers error:', error);
      res.status(500).json({ success: false, message: 'Erro ao carregar seguidores' });
    }
  },

  // GET /api/analytics/top-posts
  async getTopPosts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const data = await analyticsService.getTopPosts(req.userId!, limit);
      res.json({ success: true, data });
    } catch (error) {
      console.error('Top posts error:', error);
      res.status(500).json({ success: false, message: 'Erro ao carregar top posts' });
    }
  },

  // GET /api/analytics/viral-posts
  async getViralPosts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await analyticsService.identifyViralPosts(req.userId!);
      res.json({ success: true, data });
    } catch (error) {
      console.error('Viral posts error:', error);
      res.status(500).json({ success: false, message: 'Erro ao carregar posts virais' });
    }
  },

  // GET /api/analytics/best-times
  async getBestTimes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const data = await analyticsService.getBestPostingTimes(req.userId!);
      res.json({ success: true, data });
    } catch (error) {
      console.error('Best times error:', error);
      res.status(500).json({ success: false, message: 'Erro ao carregar melhores horários' });
    }
  },

  // GET /api/analytics/export/pdf
  async exportPDF(req: AuthRequest, res: Response): Promise<void> {
    try {
      const buffer = await reportService.generatePDFReport(req.userId!);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="relatorio-${Date.now()}.pdf"`);
      res.send(buffer);
    } catch (error) {
      console.error('PDF export error:', error);
      res.status(500).json({ success: false, message: 'Erro ao gerar PDF' });
    }
  },

  // GET /api/analytics/export/csv/engagement
  async exportEngagementCSV(req: AuthRequest, res: Response): Promise<void> {
    try {
      const csv = await reportService.generateEngagementCSV(req.userId!);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="engajamento-${Date.now()}.csv"`);
      res.send('\uFEFF' + csv); // BOM for Excel UTF-8 compatibility
    } catch (error) {
      console.error('CSV export error:', error);
      res.status(500).json({ success: false, message: 'Erro ao gerar CSV' });
    }
  },
};
