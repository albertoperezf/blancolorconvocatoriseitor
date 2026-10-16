import { block, PageSkeleton, TitleSkeleton } from '@/components/page-skeleton';

export default function Loading() {
  return (
    <PageSkeleton>
      <TitleSkeleton intro />
      <div className={`${block} mt-4 h-36`} />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${block} h-44`} />
        ))}
      </div>
    </PageSkeleton>
  );
}
