import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Personal Info Section */}
      <div className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Separator />

        {/* Avatar area */}
        <div className="flex items-center gap-6">
          <Skeleton className="size-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>

        {/* Name + Email row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Business Details Section */}
      <div className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Separator />

        {/* Bio */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-[120px] w-full" />
        </div>

        {/* Specialties */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>

        {/* Rate + Experience */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        {/* Active toggle */}
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>

      {/* Social Section */}
      <div className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Separator />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
  );
}
