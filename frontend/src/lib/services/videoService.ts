import api from './api';

export interface VideoJobInput {
  tema: string;
  estilo?: string;
  tom?: string;
  publico?: string;
  elementos?: string;
  musica?: string;
  cta?: string;
  plataformas?: string;
}

export const videoService = {
  async listJobs(): Promise<any[]> {
    const { data } = await api.get('/video');
    return data.data;
  },

  async createJob(input: VideoJobInput): Promise<{ jobId: number }> {
    const { data } = await api.post('/video', input);
    return data.data;
  },

  async getJob(id: number): Promise<any> {
    const { data } = await api.get(`/video/${id}`);
    return data.data;
  },

  async deleteJob(id: number): Promise<void> {
    await api.delete(`/video/${id}`);
  },

  async uploadVideo(file: File, caption: string): Promise<{ jobId: number }> {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('caption', caption);
    const token = localStorage.getItem('token');
    const res = await fetch('/api/video/upload', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Erro ao enviar vídeo' }));
      throw new Error(err.message || `Upload failed: ${res.status}`);
    }
    const data = await res.json();
    return data.data;
  },

  async publishToInstagram(id: number, caption: string): Promise<void> {
    await api.post(`/video/${id}/publish/instagram`, { caption });
  },
};
