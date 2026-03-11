/**
 * Instagram Graph API Service
 * Handles all communication with Instagram Graph API
 * Docs: https://developers.facebook.com/docs/instagram-api
 */
import axios from 'axios';

const IG_GRAPH_URL = 'https://graph.instagram.com';
const FB_GRAPH_URL = 'https://graph.facebook.com/v18.0';

export interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

export interface InstagramInsights {
  impressions: number;
  reach: number;
  engagement: number;
  saved: number;
  shares?: number;
  video_views?: number;
}

export interface InstagramProfile {
  id: string;
  username: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  profile_picture_url?: string;
  biography?: string;
}

export const instagramService = {
  // Get user profile information
  async getProfile(accessToken: string): Promise<InstagramProfile> {
    const { data } = await axios.get(`${IG_GRAPH_URL}/me`, {
      params: {
        fields: 'id,username,followers_count,follows_count,media_count,profile_picture_url,biography',
        access_token: accessToken,
      },
    });
    return data;
  },

  // Get media list (posts)
  async getMedia(accessToken: string, limit = 25): Promise<InstagramMedia[]> {
    const { data } = await axios.get(`${IG_GRAPH_URL}/me/media`, {
      params: {
        fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
        limit,
        access_token: accessToken,
      },
    });
    return data.data || [];
  },

  // Get post insights (requires Instagram Business/Creator account)
  async getMediaInsights(mediaId: string, accessToken: string): Promise<InstagramInsights> {
    const { data } = await axios.get(`${FB_GRAPH_URL}/${mediaId}/insights`, {
      params: {
        metric: 'impressions,reach,engagement,saved,shares',
        access_token: accessToken,
      },
    });

    const insights: InstagramInsights = {
      impressions: 0,
      reach: 0,
      engagement: 0,
      saved: 0,
    };

    if (data.data) {
      for (const metric of data.data) {
        insights[metric.name as keyof InstagramInsights] = metric.values?.[0]?.value || 0;
      }
    }

    return insights;
  },

  // Get comments on a post
  async getComments(mediaId: string, accessToken: string): Promise<any[]> {
    const { data } = await axios.get(`${IG_GRAPH_URL}/${mediaId}/comments`, {
      params: {
        fields: 'id,text,username,timestamp,from',
        access_token: accessToken,
      },
    });
    console.log(`[getComments] Raw response for ${mediaId}:`, JSON.stringify(data));
    return data.data || [];
  },

  // Send a direct message via Instagram Messaging API
  // igUserId = the business account's Instagram User ID
  // recipientIgUserId = the recipient's Instagram User ID (from comment.from.id)
  async sendDirectMessage(igUserId: string, recipientIgUserId: string, message: string, accessToken: string): Promise<void> {
    await axios.post(`${IG_GRAPH_URL}/${igUserId}/messages`, {
      recipient: { id: recipientIgUserId },
      message: { text: message },
    }, {
      params: { access_token: accessToken },
    });
  },

  // Exchange authorization code for short-lived token (Instagram Login API)
  async exchangeCode(code: string, appId: string, appSecret: string, redirectUri: string): Promise<{ access_token: string }> {
    const params = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    });
    const { data } = await axios.post('https://api.instagram.com/oauth/access_token', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return data;
  },

  // Exchange short-lived token for long-lived token
  async exchangeToken(shortLivedToken: string, appId: string, appSecret: string): Promise<{ access_token: string; expires_in: number }> {
    const { data } = await axios.get('https://graph.instagram.com/access_token', {
      params: {
        grant_type: 'ig_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        access_token: shortLivedToken,
      },
    });
    return data;
  },

  // Get OAuth authorization URL (Instagram Login API)
  getAuthUrl(appId: string, redirectUri: string, state?: string): string {
    const scopes = [
      'instagram_business_basic',
      'instagram_manage_comments',
    ].join(',');

    const stateParam = state ? `&state=${encodeURIComponent(state)}` : '';
    return `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopes}${stateParam}`;
  },
};
