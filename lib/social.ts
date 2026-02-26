/**
 * Social platform scrapers using Firecrawl.
 *
 * Each function takes a platform handle and returns a formatted text string
 * ready to be uploaded to Tropicalia as a .txt document.
 *
 * No platform API tokens required — Firecrawl scrapes public profile pages.
 */

import FirecrawlApp from "@mendable/firecrawl-js";

// Lazy singleton — only created when first call is made (avoids build-time error)
let _firecrawl: FirecrawlApp | null = null;
function getFirecrawl(): FirecrawlApp {
  if (!_firecrawl) {
    const apiKey = process.env.FIRECRAWL_API_KEY ?? "";
    if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not set");
    _firecrawl = new FirecrawlApp({ apiKey });
  }
  return _firecrawl;
}

const PROFILE_URLS: Record<string, (handle: string) => string> = {
  twitter:   (h) => `https://x.com/${h}`,
  youtube:   (h) => `https://www.youtube.com/@${h}`,
  instagram: (h) => `https://www.instagram.com/${h}/`,
};

/**
 * Scrape a creator's public social media profile using Firecrawl
 * and return formatted markdown content ready for Tropicalia upload.
 */
export async function crawlSocialProfile(
  platform: string,
  handle: string
): Promise<string> {
  const urlFn = PROFILE_URLS[platform];
  if (!urlFn) throw new Error(`Unsupported platform: ${platform}`);

  const cleanHandle = handle.replace(/^@/, "");
  const url = urlFn(cleanHandle);

  const result = await getFirecrawl().scrape(url, { formats: ["markdown"] });

  if (!result.markdown) {
    throw new Error(
      `Could not scrape ${platform} profile for @${cleanHandle}. Make sure the profile is public.`
    );
  }

  const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);

  return `# ${platformLabel} profile: @${cleanHandle}
Source: ${url}
Scraped: ${new Date().toISOString()}

${result.markdown}`;
}

/**
 * Format raw pasted text as a document ready for Tropicalia upload.
 */
export function parseManualContent(text: string): string {
  return `# Manual content
Date: ${new Date().toISOString()}

${text.trim()}`;
}
