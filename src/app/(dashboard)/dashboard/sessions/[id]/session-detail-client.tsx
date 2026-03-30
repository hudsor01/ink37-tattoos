'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { upload } from '@vercel/blob/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  DollarSign,
  ImageIcon,
  CreditCard,
  Info,
  X,
  Upload,
  Plus,
  Check,
  Clock,
  FileText,
  ShieldCheck,
} from 'lucide-react';

import { InlineEdit } from '@/components/dashboard/inline-edit';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  updateSessionFieldAction,
  addSessionImageAction,
  removeSessionImageAction,
} from '@/lib/actions/session-actions';

interface Payment {
  id: string;
  type: string;
  status: string;
  amount: number;
  createdAt: string | Date;
  customer: {
    firstName: string;
    lastName: string;
    email: string | null;
  };
}

interface SessionData {
  id: string;
  customerId: string;
  artistId: string;
  appointmentId: string | null;
  appointmentDate: string | Date;
  duration: number;
  status: string;
  designDescription: string;
  placement: string;
  size: string;
  style: string;
  referenceImages: string[] | null;
  hourlyRate: number;
  estimatedHours: number;
  depositAmount: number;
  totalCost: number;
  paidAmount: number;
  notes: string | null;
  aftercareProvided: boolean;
  consentSigned: boolean;
  consentSignedAt: string | Date | null;
  consentSignedBy: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  };
  artist: {
    id: string;
    name: string;
  };
  appointment: {
    id: string;
    type: string;
    status: string;
  } | null;
  payments: Payment[];
}

interface SessionDetailClientProps {
  session: SessionData;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export function SessionDetailClient({ session }: SessionDetailClientProps) {
  const router = useRouter();
  const [deleteImageUrl, setDeleteImageUrl] = useState<string | null>(null);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFieldSave = useCallback(
    async (field: string, value: string) => {
      const result = await updateSessionFieldAction(session.id, field, value);
      if (result && 'success' in result && !result.success) {
        throw new Error(result.error);
      }
      router.refresh();
    },
    [session.id, router]
  );

  const handleImageUpload = useCallback(
    async (file: File) => {
      const ACCEPTED_TYPES = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/avif',
      ];
      const MAX_SIZE = 10 * 1024 * 1024;

      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error('Invalid file type. Accepted: JPEG, PNG, WebP, AVIF');
        return;
      }
      if (file.size > MAX_SIZE) {
        toast.error('File too large. Maximum size is 10MB.');
        return;
      }

      setIsUploading(true);
      try {
        const blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/upload/token',
        });

        const result = await addSessionImageAction(session.id, blob.url);
        if (result && 'success' in result && !result.success) {
          throw new Error(result.error);
        }

        toast.success('Image uploaded');
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to upload image'
        );
      } finally {
        setIsUploading(false);
      }
    },
    [session.id, router]
  );

  const handleImageRemove = useCallback(async () => {
    if (!deleteImageUrl) return;
    setIsDeletingImage(true);
    try {
      const result = await removeSessionImageAction(
        session.id,
        deleteImageUrl
      );
      if (result && 'success' in result && !result.success) {
        throw new Error(result.error);
      }
      toast.success('Image removed');
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to remove image'
      );
    } finally {
      setIsDeletingImage(false);
      setDeleteImageUrl(null);
    }
  }, [session.id, deleteImageUrl, router]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    // Reset input so selecting the same file triggers onChange
    e.target.value = '';
  };

  const remainingBalance = session.totalCost - session.paidAmount;
  const images = session.referenceImages ?? [];

  return (
    <div className="space-y-6">
      {/* Session Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Session Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Status
              </p>
              <div className="mt-1">
                <StatusBadge status={session.status} />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Customer
              </p>
              <div className="mt-1">
                <Link
                  href={`/dashboard/customers/${session.customer.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {session.customer.firstName} {session.customer.lastName}
                </Link>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Artist
              </p>
              <p className="mt-1 text-sm">{session.artist.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Appointment Date
              </p>
              <p className="mt-1 text-sm">
                {format(
                  new Date(session.appointmentDate),
                  'MMM d, yyyy h:mm a'
                )}
              </p>
            </div>

            {/* Inline-editable fields */}
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Design Description
              </p>
              <InlineEdit
                value={session.designDescription}
                onSave={(val) => handleFieldSave('designDescription', val)}
                label="Design Description"
                type="textarea"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Placement
              </p>
              <InlineEdit
                value={session.placement}
                onSave={(val) => handleFieldSave('placement', val)}
                label="Placement"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Size</p>
              <InlineEdit
                value={session.size}
                onSave={(val) => handleFieldSave('size', val)}
                label="Size"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Style
              </p>
              <InlineEdit
                value={session.style}
                onSave={(val) => handleFieldSave('style', val)}
                label="Style"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Duration (minutes)
              </p>
              <InlineEdit
                value={String(session.duration)}
                onSave={(val) => handleFieldSave('duration', val)}
                label="Duration"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Hourly Rate
              </p>
              <InlineEdit
                value={String(session.hourlyRate)}
                onSave={(val) => handleFieldSave('hourlyRate', val)}
                label="Hourly Rate"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Estimated Hours
              </p>
              <InlineEdit
                value={String(session.estimatedHours)}
                onSave={(val) => handleFieldSave('estimatedHours', val)}
                label="Estimated Hours"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Notes
              </p>
              <InlineEdit
                value={session.notes ?? ''}
                onSave={(val) => handleFieldSave('notes', val)}
                label="Notes"
                type="textarea"
                placeholder="No notes"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Total Cost
              </p>
              <p className="mt-1 text-2xl font-bold">
                {currencyFormatter.format(session.totalCost)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Deposit
              </p>
              <p className="mt-1 text-2xl font-bold">
                {currencyFormatter.format(session.depositAmount)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium text-muted-foreground">Paid</p>
              <p className="mt-1 text-2xl font-bold text-green-600">
                {currencyFormatter.format(session.paidAmount)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Remaining
              </p>
              <p
                className={`mt-1 text-2xl font-bold ${
                  remainingBalance > 0
                    ? 'text-amber-600'
                    : 'text-green-600'
                }`}
              >
                {currencyFormatter.format(remainingBalance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked Payments Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Linked Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {session.payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {session.payments.map((payment: Payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={payment.type} />
                    </TableCell>
                    <TableCell>
                      {currencyFormatter.format(Number(payment.amount))}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={payment.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
              <CreditCard className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                No payments recorded
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reference Images Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Reference Images
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-pulse" />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Image
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={handleFileSelect}
              className="hidden"
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {images.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {images.map((imgUrl) => (
                <div key={imgUrl} className="group relative aspect-square">
                  <Image
                    src={imgUrl}
                    alt="Reference image"
                    fill
                    className="rounded-lg border object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                  />
                  <button
                    type="button"
                    onClick={() => setDeleteImageUrl(imgUrl)}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) =>
                e.key === 'Enter' && fileInputRef.current?.click()
              }
              role="button"
              tabIndex={0}
            >
              <Upload className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                No reference images. Click to upload.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata Footer */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>
            Created {format(new Date(session.createdAt), 'MMM d, yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <FileText className="h-4 w-4" />
          <span>
            Updated {format(new Date(session.updatedAt), 'MMM d, yyyy')}
          </span>
        </div>
        <Badge variant={session.aftercareProvided ? 'default' : 'secondary'}>
          {session.aftercareProvided ? (
            <Check className="mr-1 h-3 w-3" />
          ) : (
            <X className="mr-1 h-3 w-3" />
          )}
          Aftercare {session.aftercareProvided ? 'Provided' : 'Not Provided'}
        </Badge>
        <Badge variant={session.consentSigned ? 'default' : 'destructive'}>
          <ShieldCheck className="mr-1 h-3 w-3" />
          Consent {session.consentSigned ? 'Signed' : 'Not Signed'}
        </Badge>
      </div>

      {/* Image Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteImageUrl}
        onOpenChange={(open) => !open && setDeleteImageUrl(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Reference Image</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the image from storage. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleImageRemove}
              disabled={isDeletingImage}
              variant="destructive"
            >
              {isDeletingImage ? 'Removing...' : 'Remove Image'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
