import { block, PageSkeleton, TitleSkeleton } from '@/components/page-skeleton';

export default function Loading() {
  return (
    <PageSkeleton className="mx-auto max-w-xl">
      <TitleSkeleton intro />
      <div className={`${block} mt-4 h-[26rem]`} />
    </PageSkeleton>
  );
}
