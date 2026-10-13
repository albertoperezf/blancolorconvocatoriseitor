import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// iOS home-screen icon: the same ball as icon.svg on the brand blue.
export default async function AppleIcon() {
  const svg = await readFile(join(process.cwd(), 'src/app/icon.svg'));
  const src = `data:image/svg+xml;base64,${svg.toString('base64')}`;
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0b5cad',
      }}
    >
      <img src={src} width={136} height={136} alt="" />
    </div>,
    size,
  );
}
