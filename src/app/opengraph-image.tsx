import { ImageResponse } from 'next/og';

export const alt = 'Blancolores · Convocatoria';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px',
        background: '#0b5cad',
        color: '#ffffff',
      }}
    >
      <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -2 }}>Blancolores</div>
      <div style={{ fontSize: 48, marginTop: 24 }}>¿Vas al partido de esta semana?</div>
      <div style={{ fontSize: 36, marginTop: 16, opacity: 0.85 }}>Convocatoria, resultados y fichajes</div>
    </div>,
    size,
  );
}
