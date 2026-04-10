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

  // Direct-to-Supabase upload: file never passes through the backend
  async uploadVideo(file: File, caption: string): Promise<{ jobId: number }> {
    // Step 1: get a signed upload URL from backend
    const { data: initData } = await api.post('/video/upload/signed-url', {
      filename: file.name,
    });
    const { signedUrl, path } = initData.data as { signedUrl: string; path: string };

    // Step 2: upload directly to Supabase (no backend involved)
    const uploadRes = await fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'video/mp4' },
      body: file,
    });
    if (!uploadRes.ok) {
      const text = await uploadRes.text().catch(() => '');
      throw new Error(`Supabase upload failed (${uploadRes.status}): ${text}`);
    }

    // Step 3: tell backend to save to DB
    const { data: completeData } = await api.post('/video/upload/complete', {
      path,
      caption,
    });
    return completeData.data;
  },

  async publishToInstagram(id: number, caption: string): Promise<void> {
    await api.post(`/video/${id}/publish/instagram`, { caption }, { timeout: 120000 });
  },

  async publishToTikTok(id: number, caption: string): Promise<void> {
    await api.post(`/video/${id}/publish/tiktok`, { caption }, { timeout: 120000 });
  },
};
