import { block, line, PageSkeleton, TitleSkeleton } from '@/components/page-skeleton';

export default function Loading() {
  return (
    <PageSkeleton>
      <div className="flex items-center justify-between gap-3">
        <TitleSkeleton />
        <div className={`${line} h-11 w-36 rounded-xl`} />
      </div>
      <div className={`${line} mt-4 h-5 w-80 max-w-full`} />
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className={`${block} h-[70px] sm:h-[78px]`} />
        ))}
      </div>
    </PageSkeleton>
  );
}
