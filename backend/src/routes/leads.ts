import { Router } from 'express';
import { leadsController } from '../controllers/leadsController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { validate, schemas } from '../middlewares/validationMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/', leadsController.getLeads);
router.get('/stats', leadsController.getLeadStats);
router.get('/export/csv', leadsController.exportCSV);
router.get('/:id', leadsController.getLead);
router.post('/', validate(schemas.createLead), leadsController.createLead);
router.put('/:id/status', validate(schemas.updateLeadStatus), leadsController.updateLeadStatus);
router.delete('/:id', leadsController.deleteLead);

export default router;
