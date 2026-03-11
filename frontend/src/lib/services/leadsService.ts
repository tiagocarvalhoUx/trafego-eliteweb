import api from './api';

export const leadsService = {
  getLeads: (params?: Record<string, string | number>) =>
    api.get('/leads', { params }).then((r) => r.data),

  getLead: (id: number) => api.get(`/leads/${id}`).then((r) => r.data.data),

  createLead: (payload: object) => api.post('/leads', payload).then((r) => r.data),

  updateStatus: (id: number, status: string) =>
    api.put(`/leads/${id}/status`, { status }).then((r) => r.data),

  deleteLead: (id: number) => api.delete(`/leads/${id}`).then((r) => r.data),

  getStats: () => api.get('/leads/stats').then((r) => r.data.data),

  exportCSV: async () => {
    const response = await api.get('/leads/export/csv', { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
