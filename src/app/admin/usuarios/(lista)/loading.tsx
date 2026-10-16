import { block, line, PageSkeleton, TitleSkeleton } from '@/components/page-skeleton';

export default function Loading() {
  return (
    <PageSkeleton>
      <TitleSkeleton />
      <div className={`${block} mt-4 h-64`} />
      <div className={`${line} mt-6 h-7 w-56`} />
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className={`${block} h-[70px] sm:h-[78px]`} />
        ))}
      </div>
    </PageSkeleton>
  );
}
