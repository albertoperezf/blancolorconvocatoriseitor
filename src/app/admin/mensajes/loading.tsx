import { block, PageSkeleton, TitleSkeleton } from '@/components/page-skeleton';

export default function Loading() {
  return (
    <PageSkeleton>
      <TitleSkeleton intro />
      <div className="mt-4 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${block} h-32`} />
        ))}
      </div>
    </PageSkeleton>
  );
}
