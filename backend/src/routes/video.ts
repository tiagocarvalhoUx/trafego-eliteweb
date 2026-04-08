import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { videoController, handleMulterError } from '../controllers/videoController';

const router = Router();

router.use(authMiddleware);

router.get('/', videoController.listJobs);
router.post('/', videoController.createJob);

// Direct-to-Supabase upload flow (no file passes through backend)
router.post('/upload/signed-url', videoController.getSignedUploadUrl);
router.post('/upload/complete', videoController.completeUpload);

router.post('/:id/publish/instagram', videoController.publishToInstagram);
router.post('/:id/publish/tiktok', videoController.publishToTikTok);
router.get('/:id', videoController.getJob);
router.delete('/:id', videoController.deleteJob);

router.use(handleMulterError);

export default router;
