import { getTranslations } from 'next-intl/server';

export async function FaqList({ faqs }: { faqs: { id: number; question: string; answer: string }[] }) {
  const t = await getTranslations('faq');
  return (
    <section id="faq" aria-labelledby="faq-heading" className="mt-10">
      <h2 id="faq-heading" className="text-xl font-extrabold">
        {t('heading')}
      </h2>
      <div className="card mt-3 divide-y divide-border p-0 sm:p-0">
        {faqs.map((f) => (
          <details key={f.id} id={`faq-${f.id}`} className="group">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-3 font-semibold sm:px-5 [&::-webkit-details-marker]:hidden">
              <span className="flex-1">{f.question}</span>
              <span aria-hidden className="text-muted transition-transform group-open:rotate-180">
                ▾
              </span>
            </summary>
            <p className="px-4 pb-4 text-muted sm:px-5">{f.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
