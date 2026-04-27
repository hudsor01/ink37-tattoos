import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Unauthorized() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-bold">401 — Sign in required</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        You need to be signed in to access this page.
      </p>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" render={<Link href="/" />}>Go home</Button>
        <Button render={<Link href="/login" />}>Sign in</Button>
      </div>
    </div>
  );
}
