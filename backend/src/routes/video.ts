import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { videoController } from '../controllers/videoController';

const router = Router();

router.use(authMiddleware);

router.get('/', videoController.listJobs);
router.post('/', videoController.createJob);
router.get('/:id', videoController.getJob);
router.delete('/:id', videoController.deleteJob);

export default router;
