/**
 * Cron Job: Data Collection
 * Runs daily at 23:00 to collect metrics from all connected social accounts
 */
import cron from 'node-cron';
import pool from '../config/database';
import { analyticsService } from '../services/analyticsService';
import { automationService } from '../services/automationService';
import { notificationService } from '../services/notificationService';

export function startDataCollectionCron(): void {
  // Daily data collection at 23:00
  cron.schedule('0 23 * * *', async () => {
    console.log('⏰ [CRON] Starting daily data collection...');

    try {
      const [contas] = await pool.query(
        `SELECT id, plataforma, access_token FROM contas_sociais WHERE ativo = true`
      );

      for (const conta of contas as any[]) {
        try {
          if (conta.plataforma === 'instagram') {
            await analyticsService.collectInstagramData(conta.id, conta.access_token);
          } else if (conta.plataforma === 'tiktok') {
            await analyticsService.collectTikTokData(conta.id, conta.access_token);
          }
        } catch (error) {
          console.error(`[CRON] Failed to collect data for account ${conta.id}:`, error);
        }
      }

      // Check follower growth alerts
      await notificationService.checkFollowerAlerts();

      console.log('✅ [CRON] Daily data collection completed');
    } catch (error) {
      console.error('❌ [CRON] Daily data collection failed:', error);
    }
  }, {
    timezone: 'America/Sao_Paulo',
  });

  // Automation cycle every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('⏰ [CRON] Running automation cycle...');
    try {
      await automationService.runAutomationCycle();
      console.log('✅ [CRON] Automation cycle completed');
    } catch (error) {
      console.error('❌ [CRON] Automation cycle failed:', error);
    }
  });

  console.log('✅ Data collection cron jobs scheduled');
}
