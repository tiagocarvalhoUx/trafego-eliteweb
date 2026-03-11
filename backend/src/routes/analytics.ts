import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/dashboard', analyticsController.getDashboard);
router.get('/engagement', analyticsController.getEngagement);
router.get('/followers', analyticsController.getFollowers);
router.get('/top-posts', analyticsController.getTopPosts);
router.get('/viral-posts', analyticsController.getViralPosts);
router.get('/best-times', analyticsController.getBestTimes);
router.get('/export/pdf', analyticsController.exportPDF);
router.get('/export/csv/engagement', analyticsController.exportEngagementCSV);

export default router;
