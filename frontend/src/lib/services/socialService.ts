import api from './api';

export const socialService = {
  getAccounts: () => api.get('/social/accounts').then((r) => r.data.data),

  disconnectAccount: (id: number) => api.delete(`/social/accounts/${id}`).then((r) => r.data),

  getInstagramAuthUrl: () => api.get('/social/instagram/auth-url').then((r) => r.data.data.url),

  getTikTokAuthUrl: () => api.get('/social/tiktok/auth-url').then((r) => r.data.data.url),

  triggerCollection: (contaId: number) =>
    api.post(`/social/collect/${contaId}`).then((r) => r.data),
};
