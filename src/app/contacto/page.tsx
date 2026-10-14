import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ContactForm } from './contact-form';

export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Escribe al organizador del partido de los jueves de Blancolores.',
  alternates: { canonical: '/contacto' },
};

export default async function ContactPage() {
  const t = await getTranslations('contact');
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-extrabold tracking-tight">{t('title')}</h1>
      <p className="mt-2 text-muted">{t('intro')}</p>
      <div className="card mt-4">
        <ContactForm />
      </div>
    </div>
  );
}
