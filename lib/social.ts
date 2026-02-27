/**
 * Social content scrapers powered by Firecrawl.
 *
 * Primary flow:
 *   crawlUrl(url)  — scrape ANY URL (used when the frontend passes an editable URL)
 *
 * Fallback:
 *   crawlSocialProfile(platform, handle)  — builds the platform URL then calls crawlUrl
 *
 * No platform API tokens required. Firecrawl scrapes public pages and returns
 * clean markdown, which we upload as a .txt file to Tropicalia.
 */

import FirecrawlApp from "@mendable/firecrawl-js";

// Lazy singleton — avoid build-time errors when the env var is absent
let _firecrawl: FirecrawlApp | null = null;
function getFirecrawl(): FirecrawlApp {
  if (!_firecrawl) {
    const apiKey = process.env.FIRECRAWL_API_KEY ?? "";
    if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not set");
    _firecrawl = new FirecrawlApp({ apiKey });
  }
  return _firecrawl;
}

// Platform URL builders (fallback when no direct URL is provided)
const PROFILE_URLS: Record<string, (handle: string) => string> = {
  twitter:   (h) => `https://x.com/${h}`,
  youtube:   (h) => `https://www.youtube.com/@${h}`,
  instagram: (h) => `https://www.instagram.com/${h}/`,
};

// ---------------------------------------------------------------------------

/**
 * Scrape any URL with Firecrawl and return formatted text for Tropicalia.
 * This is the primary function — called when the frontend passes an editable URL.
 */
export async function crawlUrl(url: string): Promise<string> {
  const result = await getFirecrawl().scrape(url, {
    formats: ["markdown"],
  });

  const markdown = (result as any).markdown as string | undefined;

  if (!markdown?.trim()) {
    throw new Error(
      `Firecrawl returned no content for ${url}. ` +
      `Make sure the profile is public and the URL is correct.`
    );
  }

  return `# Scraped content
Source: ${url}
Scraped: ${new Date().toISOString()}

${markdown}`;
}

/**
 * Build a platform URL from a handle and scrape it.
 * Fallback for when no direct URL was provided by the frontend.
 */
export async function crawlSocialProfile(
  platform: string,
  handle: string
): Promise<string> {
  const buildUrl = PROFILE_URLS[platform];
  if (!buildUrl) throw new Error(`Unsupported platform: ${platform}`);
  const cleanHandle = handle.replace(/^@/, "");
  return crawlUrl(buildUrl(cleanHandle));
}

/**
 * Format raw pasted text as a Tropicalia document.
 */
export function parseManualContent(text: string): string {
  return `# Manual content
Date: ${new Date().toISOString()}

${text.trim()}`;
}
