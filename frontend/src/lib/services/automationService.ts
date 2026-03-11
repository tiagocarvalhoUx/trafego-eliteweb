import api from './api';

export const automationService = {
  getAutomations: () => api.get('/automation').then((r) => r.data.data),

  createAutomation: (payload: object) => api.post('/automation', payload).then((r) => r.data),

  toggleAutomation: (id: number) => api.put(`/automation/${id}/toggle`).then((r) => r.data),

  deleteAutomation: (id: number) => api.delete(`/automation/${id}`).then((r) => r.data),

  getGoals: () => api.get('/automation/goals').then((r) => r.data.data),

  createGoal: (payload: object) => api.post('/automation/goals', payload).then((r) => r.data),

  getNotifications: () => api.get('/automation/notifications').then((r) => r.data.data),

  markNotificationRead: (id: number) =>
    api.put(`/automation/notifications/${id}/read`).then((r) => r.data),

  runCycle: () => api.post('/automation/run-cycle').then((r) => r.data),
};
