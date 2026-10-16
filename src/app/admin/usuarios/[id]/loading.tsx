import { block, line, PageSkeleton, TitleSkeleton } from '@/components/page-skeleton';

export default function Loading() {
  return (
    <PageSkeleton className="mx-auto max-w-xl">
      <div className={`${line} mb-3 h-6 w-24`} />
      <TitleSkeleton />
      <div className={`${block} mt-4 h-[28rem]`} />
      <div className={`${block} mt-4 h-40`} />
    </PageSkeleton>
  );
}
