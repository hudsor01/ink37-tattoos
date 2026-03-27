import { Skeleton } from '@/components/ui/skeleton';

export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Skeleton className="h-96 w-full max-w-md rounded-lg" />
    </div>
  );
}
