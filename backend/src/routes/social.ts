import { Router } from 'express';
import { socialController } from '../controllers/socialController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Public endpoints (no auth needed)
router.post('/instagram/deauthorize', (_req, res) => res.json({ success: true }));
router.post('/instagram/data-deletion', (_req, res) => res.json({ success: true, url: '', confirmation_code: '' }));
router.get('/instagram/callback', socialController.instagramCallback);

router.use(authMiddleware);

router.get('/accounts', socialController.getAccounts);
router.delete('/accounts/:id', socialController.disconnectAccount);
router.post('/collect/:contaId', socialController.triggerCollection);

// Instagram OAuth
router.get('/instagram/auth-url', socialController.getInstagramAuthUrl);

// TikTok OAuth
router.get('/tiktok/auth-url', socialController.getTikTokAuthUrl);
router.get('/tiktok/callback', socialController.tiktokCallback);

export default router;
