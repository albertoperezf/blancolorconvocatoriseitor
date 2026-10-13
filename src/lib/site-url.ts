/** Public origin for canonical URLs, sitemap and social previews (APP_URL in production). */
export function siteUrl(): string {
  return (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}
