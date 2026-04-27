import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Forbidden() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-bold">403 — Forbidden</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        You don&apos;t have permission to access this resource. If you believe this is
        an error, contact an administrator.
      </p>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" render={<Link href="/" />}>Go home</Button>
        <Button render={<Link href="/dashboard" />}>Dashboard</Button>
      </div>
    </div>
  );
}
