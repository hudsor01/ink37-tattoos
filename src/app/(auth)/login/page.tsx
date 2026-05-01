'use client';

import { useState } from 'react';
import { signIn } from '@/lib/auth-client';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { safeCallbackUrl } from '@/lib/safe-callback';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const rawCallback = searchParams.get('callbackUrl');

    await signIn.email({
      email,
      password,
      // Validate before forwarding to Better Auth so a hand-crafted
      // ?callbackUrl=//evil.com or ?callbackUrl=https://evil.com cannot
      // trick a signed-in user into landing on an attacker-controlled
      // page. safeCallbackUrl also rejects /login and /register so we
      // can't loop the user back to the auth flow.
      callbackURL: safeCallbackUrl(rawCallback, '/dashboard'),
    }, {
      onSuccess: (ctx) => {
        // Route by role: admin/super_admin → dashboard, everyone else → portal.
        // The role-based fallback only applies when no safe callback was
        // supplied; an explicit safe callbackUrl always wins.
        const role = ctx.data?.user?.role as string | undefined;
        const isAdmin = role === 'admin' || role === 'super_admin';
        const target = safeCallbackUrl(rawCallback, isAdmin ? '/dashboard' : '/portal');
        window.location.href = target;
      },
      onError: (ctx) => {
        setError(ctx.error.message ?? 'Invalid email or password. Please try again.');
        setLoading(false);
      },
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>
          Sign in to your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary underline-offset-4 hover:underline">
              Register
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
