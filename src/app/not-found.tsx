import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="text-2xl font-extrabold">Fuera de juego</h1>
      <p className="mt-2 text-muted">Esta página no existe.</p>
      <Link href="/" className="btn-primary mt-6">
        Volver a la convocatoria
      </Link>
    </div>
  );
}
