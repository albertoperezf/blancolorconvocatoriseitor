import { block, PageSkeleton, TitleSkeleton } from '@/components/page-skeleton';

export default function Loading() {
  return (
    <PageSkeleton>
      <TitleSkeleton />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${block} h-28`} />
        ))}
      </div>
    </PageSkeleton>
  );
}
