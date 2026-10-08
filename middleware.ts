// zenovay:ai-crawl-beacon v3 — written by `npx zenovay init`.
// Reports AI-crawler requests to Zenovay.
// Crawlers do not run JavaScript, so the browser tracker can never see them.
// Zero dependencies. Classification and IP verification happen server-side, so
// this file never needs updating when a new crawler appears. Safe to delete.
import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';

const ZENOVAY_ENDPOINT = 'https://api.zenovay.com/c/ZV_ZujEmoTp7ONXlB0hYTgnJk5J';
// Skip only what is plainly a human browser; the server identifies the rest.
const ZENOVAY_BROWSER = /(?:Chrome|CriOS|Firefox|FxiOS|Edg|EdgiOS|OPR|Version)\/\d/;
const ZENOVAY_BOT = /bot|crawler|spider|agent|fetch|scrap|\+https?:\/\//i;
const ZENOVAY_SKIP = /^(?!\/(?:robots|llms|llms-full|ai)\.txt$)(?!.*sitemap[\w./-]*\.xml$).*\.(?:js|mjs|cjs|css|map|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|eot|otf|mp4|webm|mp3|pdf|zip|txt|xml|json)$/i;

function zenovayCrawlerBeacon(request: NextRequest, event: NextFetchEvent): void {
  try {
    const ua = request.headers.get('user-agent') || '';
    if (!ua) return;
    const zenovayCandidate = !ZENOVAY_BROWSER.test(ua) || ZENOVAY_BOT.test(ua);
    if (!zenovayCandidate) return;
    const url = new URL(request.url);
    if (ZENOVAY_SKIP.test(url.pathname)) return;
    const forwarded = request.headers.get('x-forwarded-for');
    const ip =
      request.headers.get('cf-connecting-ip') ||
      (forwarded ? forwarded.split(',')[0].trim() : '');
    const referrer = request.headers.get('referer');
    event.waitUntil(
      fetch(ZENOVAY_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          u: url.toString(),
          ua,
          ip: ip || undefined,
          r: referrer || undefined,
          src: 'middleware',
        }),
      }).catch(() => undefined),
    );
  } catch {
    // Analytics must never break a request.
  }
}

export function middleware(request: NextRequest, event: NextFetchEvent) {
  zenovayCrawlerBeacon(request, event);
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
