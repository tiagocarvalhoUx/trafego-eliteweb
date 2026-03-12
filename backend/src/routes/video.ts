import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { videoController, upload } from '../controllers/videoController';

const router = Router();

router.use(authMiddleware);

router.get('/', videoController.listJobs);
router.post('/', videoController.createJob);
router.post('/upload', upload.single('video'), videoController.uploadVideo);
router.post('/:id/publish/instagram', videoController.publishToInstagram);
router.get('/:id', videoController.getJob);
router.delete('/:id', videoController.deleteJob);

export default router;
