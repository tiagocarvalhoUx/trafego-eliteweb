import { Router } from 'express';
import { automationController } from '../controllers/automationController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { validate, schemas } from '../middlewares/validationMiddleware';

const router = Router();

router.use(authMiddleware);

// Automations
router.get('/', automationController.getAutomations);
router.post('/', validate(schemas.createAutomation), automationController.createAutomation);
router.put('/:id/toggle', automationController.toggleAutomation);
router.delete('/:id', automationController.deleteAutomation);

// Manual cycle trigger
router.post('/run-cycle', automationController.runCycle);

// Goals
router.get('/goals', automationController.getGoals);
router.post('/goals', validate(schemas.createMeta), automationController.createGoal);

// Notifications
router.get('/notifications', automationController.getNotifications);
router.put('/notifications/:id/read', automationController.markNotificationRead);

export default router;
