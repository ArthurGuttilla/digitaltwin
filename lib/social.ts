/**
 * Social platform content parsers and fetchers.
 *
 * Each platform returns an array of ContextChunk objects ready
 * to be ingested into Tropicalia.
 */

import type { ContextChunk } from "./tropicalia";

// ---------------------------------------------------------------------------
// Twitter / X
// ---------------------------------------------------------------------------

export interface TwitterPost {
  id: string;
  text: string;
  created_at: string;
  public_metrics?: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
  };
}

/**
 * Fetch recent tweets for a handle via Twitter API v2.
 * Requires TWITTER_BEARER_TOKEN env var.
 */
export async function fetchTwitterPosts(handle: string, maxResults = 100): Promise<ContextChunk[]> {
  const token = process.env.TWITTER_BEARER_TOKEN;
  if (!token) throw new Error("Missing TWITTER_BEARER_TOKEN");

  // 1. Resolve user ID
  const userRes = await fetch(
    `https://api.twitter.com/2/users/by/username/${handle}?user.fields=description,name`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!userRes.ok) throw new Error(`Twitter user lookup failed: ${userRes.status}`);
  const userData = await userRes.json();
  const userId = userData.data?.id;
  if (!userId) throw new Error("Twitter user not found");

  // 2. Fetch tweets
  const tweetsRes = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?max_results=${Math.min(maxResults, 100)}&tweet.fields=created_at,public_metrics&exclude=retweets`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!tweetsRes.ok) throw new Error(`Twitter tweets fetch failed: ${tweetsRes.status}`);
  const tweetsData = await tweetsRes.json();
  const tweets: TwitterPost[] = tweetsData.data ?? [];

  return tweets
    .filter((t) => t.text.length > 20) // skip very short tweets
    .map((t) => ({
      content: t.text,
      metadata: {
        platform: "twitter",
        post_id: t.id,
        created_at: t.created_at,
        likes: String(t.public_metrics?.like_count ?? 0),
      },
    }));
}

// ---------------------------------------------------------------------------
// YouTube
// ---------------------------------------------------------------------------

/**
 * Fetch video titles + descriptions for a YouTube channel.
 * Requires YOUTUBE_API_KEY env var.
 */
export async function fetchYouTubePosts(channelHandle: string, maxResults = 50): Promise<ContextChunk[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("Missing YOUTUBE_API_KEY");

  // Search for channel by handle
  const searchRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(channelHandle)}&key=${key}`
  );
  if (!searchRes.ok) throw new Error(`YouTube channel search failed: ${searchRes.status}`);
  const searchData = await searchRes.json();
  const channelId = searchData.items?.[0]?.snippet?.channelId;
  if (!channelId) throw new Error("YouTube channel not found");

  // Fetch recent videos
  const videosRes = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=${maxResults}&order=date&type=video&key=${key}`
  );
  if (!videosRes.ok) throw new Error(`YouTube videos fetch failed: ${videosRes.status}`);
  const videosData = await videosRes.json();

  return (videosData.items ?? []).map((item: any) => ({
    content: `${item.snippet.title}\n${item.snippet.description}`.trim(),
    metadata: {
      platform: "youtube",
      video_id: item.id?.videoId ?? "",
      published_at: item.snippet.publishedAt ?? "",
      title: item.snippet.title,
    },
  }));
}

// ---------------------------------------------------------------------------
// Instagram (via Basic Display API or scrape fallback)
// ---------------------------------------------------------------------------

/**
 * Fetch recent Instagram media captions using the Graph API.
 * Requires INSTAGRAM_ACCESS_TOKEN env var (long-lived token).
 */
export async function fetchInstagramPosts(userId: string, maxResults = 50): Promise<ContextChunk[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) throw new Error("Missing INSTAGRAM_ACCESS_TOKEN");

  const res = await fetch(
    `https://graph.instagram.com/${userId}/media?fields=id,caption,timestamp,media_type&limit=${maxResults}&access_token=${token}`
  );
  if (!res.ok) throw new Error(`Instagram fetch failed: ${res.status}`);
  const data = await res.json();

  return (data.data ?? [])
    .filter((item: any) => item.caption)
    .map((item: any) => ({
      content: item.caption as string,
      metadata: {
        platform: "instagram",
        post_id: item.id,
        media_type: item.media_type,
        timestamp: item.timestamp,
      },
    }));
}

// ---------------------------------------------------------------------------
// Manual paste fallback
// ---------------------------------------------------------------------------

/**
 * Parse raw pasted text into chunks (one per paragraph / line).
 * Used when a creator pastes their own content manually.
 */
export function parseManualContent(text: string, platform = "manual"): ContextChunk[] {
  return text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 20)
    .map((chunk) => ({
      content: chunk,
      metadata: { platform, ingested_at: new Date().toISOString() },
    }));
}
