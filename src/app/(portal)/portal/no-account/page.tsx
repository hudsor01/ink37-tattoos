import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function NoAccountPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <AlertCircle className="h-6 w-6 text-amber-600" />
          </div>
          <CardTitle>No Client Account Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Your login is not linked to a client account. This usually means you
            registered with a different email than the one on file with us.
          </p>
          <p className="text-sm text-muted-foreground">
            Please contact the studio to link your account, or book a
            consultation to get started.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button render={<Link href="/contact" />}>Contact Us</Button>
            <Button variant="outline" render={<Link href="/" />}>Back to Home</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
