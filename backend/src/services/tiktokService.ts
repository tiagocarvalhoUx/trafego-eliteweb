/**
 * TikTok For Developers API Service
 * Docs: https://developers.tiktok.com/doc/overview
 */
import axios from 'axios';

const TIKTOK_API_URL = 'https://open.tiktokapis.com/v2';

export interface TikTokVideo {
  id: string;
  create_time: number;
  description: string;
  share_url: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  video_duration: number;
  cover_image_url?: string;
}

export interface TikTokUserInfo {
  open_id: string;
  display_name: string;
  avatar_url: string;
  follower_count: number;
  following_count: number;
  video_count: number;
  likes_count: number;
  username?: string;
}

export interface TikTokInsights {
  profile_views: number;
  video_views: number;
  net_follower_count: number;
  comments: number;
  likes: number;
  shares: number;
}

export const tiktokService = {
  // Get user info
  async getUserInfo(accessToken: string): Promise<TikTokUserInfo> {
    const { data } = await axios.get(`${TIKTOK_API_URL}/user/info/`, {
      params: {
        fields: 'open_id,display_name,avatar_url,follower_count,following_count,video_count,likes_count,username',
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return data.data?.user || data.data;
  },

  // Get user videos
  async getVideos(accessToken: string, maxCount = 20): Promise<TikTokVideo[]> {
    const { data } = await axios.post(
      `${TIKTOK_API_URL}/video/list/`,
      {
        fields: ['id', 'create_time', 'description', 'share_url', 'view_count', 'like_count', 'comment_count', 'share_count', 'video_duration', 'cover_image_url'],
        max_count: maxCount,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return data.data?.videos || [];
  },

  // Get video details
  async getVideoDetails(accessToken: string, videoIds: string[]): Promise<TikTokVideo[]> {
    const { data } = await axios.post(
      `${TIKTOK_API_URL}/video/query/`,
      {
        fields: ['id', 'view_count', 'like_count', 'comment_count', 'share_count'],
        filters: { video_ids: videoIds },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return data.data?.videos || [];
  },

  // Exchange auth code for access token
  async exchangeCode(code: string, clientKey: string, clientSecret: string, redirectUri: string): Promise<{ access_token: string; refresh_token: string; expires_in: number; refresh_expires_in: number }> {
    const { data } = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });
    return data;
  },

  // Refresh access token
  async refreshToken(refreshToken: string, clientKey: string, clientSecret: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const { data } = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    return data;
  },

  // Publish video to TikTok using Content Posting API (pull from URL)
  async publishVideo(accessToken: string, videoUrl: string, caption: string): Promise<{ publish_id: string }> {
    // Step 1: Initialize publish via pull URL
    const { data: initData } = await axios.post(
      `${TIKTOK_API_URL}/post/publish/video/init/`,
      {
        post_info: {
          title: caption.slice(0, 150),
          privacy_level: 'SELF_ONLY',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: videoUrl,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (initData.error?.code !== 'ok') {
      throw new Error(`TikTok publish error: ${initData.error?.message || JSON.stringify(initData)}`);
    }

    return { publish_id: initData.data?.publish_id };
  },

  // Check publish status
  async getPublishStatus(accessToken: string, publishId: string): Promise<string> {
    const { data } = await axios.post(
      `${TIKTOK_API_URL}/post/publish/status/fetch/`,
      { publish_id: publishId },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    // status: PROCESSING_UPLOAD, PROCESSING_DOWNLOAD, SEND_TO_USER_INBOX, PUBLISH_COMPLETE, FAILED
    return data.data?.status || 'UNKNOWN';
  },

  // Get OAuth authorization URL
  getAuthUrl(clientKey: string, redirectUri: string, state: string): string {
    const scopes = ['user.info.basic', 'video.list', 'video.publish'].join(',');
    return `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&response_type=code&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  },
};
