import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Blancolores · Convocatoria',
    short_name: 'Blancolores',
    lang: 'es',
    start_url: '/partido',
    display: 'standalone',
    background_color: '#f6f7f9',
    theme_color: '#0b5cad',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
