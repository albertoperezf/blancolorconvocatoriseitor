import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/resultados`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/contacto`, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
