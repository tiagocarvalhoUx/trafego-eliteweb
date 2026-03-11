import api from './api';

export const analyticsService = {
  getDashboard: () => api.get('/analytics/dashboard').then((r) => r.data.data),
  getEngagement: (days = 30) => api.get(`/analytics/engagement?days=${days}`).then((r) => r.data.data),
  getFollowers: (days = 30) => api.get(`/analytics/followers?days=${days}`).then((r) => r.data.data),
  getTopPosts: (limit = 5) => api.get(`/analytics/top-posts?limit=${limit}`).then((r) => r.data.data),
  getViralPosts: () => api.get('/analytics/viral-posts').then((r) => r.data.data),
  getBestTimes: () => api.get('/analytics/best-times').then((r) => r.data.data),

  exportPDF: async () => {
    const response = await api.get('/analytics/export/pdf', { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${Date.now()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },

  exportEngagementCSV: async () => {
    const response = await api.get('/analytics/export/csv/engagement', { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `engajamento-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
