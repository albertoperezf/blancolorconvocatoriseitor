import { block, PageSkeleton, TitleSkeleton } from '@/components/page-skeleton';

export default function Loading() {
  return (
    <PageSkeleton>
      <TitleSkeleton intro />
      <div className={`${block} mt-4 h-[32rem]`} />
    </PageSkeleton>
  );
}
