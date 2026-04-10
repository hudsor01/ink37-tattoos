'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Undo2 } from 'lucide-react';

interface Design {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  fileUrl: string;
  style: string | null;
  tags: string[] | null;
  isApproved: boolean;
  rejectionNotes: string | null;
  createdAt: Date | string;
}

interface DesignApprovalCardProps {
  design: Design;
  onApprove: (id: string) => void;
  onReject: (id: string, notes: string) => void;
}

export function DesignApprovalCard({
  design,
  onApprove,
  onReject,
}: DesignApprovalCardProps) {
  const [isPending, startTransition] = useTransition();
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const imageSrc = design.thumbnailUrl ?? design.fileUrl;

  function handleApprove() {
    startTransition(() => {
      onApprove(design.id);
    });
  }

  function handleRevoke() {
    startTransition(() => {
      onReject(design.id, 'Approval revoked');
    });
  }

  function handleRejectConfirm() {
    if (!rejectionNotes.trim()) return;
    startTransition(() => {
      onReject(design.id, rejectionNotes.trim());
      setRejectionNotes('');
      setDialogOpen(false);
    });
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[4/3]">
        <Image
          src={imageSrc}
          alt={design.name}
          fill
          loading="lazy"
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
      </div>
      <CardContent className="p-3">
        <h3 className="font-semibold text-sm truncate">{design.name}</h3>
        {design.style && (
          <p className="text-xs text-muted-foreground mt-0.5">{design.style}</p>
        )}
        {design.tags && design.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {design.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-micro px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {design.tags.length > 3 && (
              <Badge variant="outline" className="text-micro px-1.5 py-0">
                +{design.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
        {!design.isApproved && design.rejectionNotes && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 italic">
            Rejection notes: {design.rejectionNotes}
          </p>
        )}
      </CardContent>
      <CardFooter className="p-3 pt-0 gap-2">
        {design.isApproved ? (
          <>
            <Badge variant="default" className="mr-auto">Approved</Badge>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={handleRevoke}
              disabled={isPending}
            >
              <Undo2 className="h-3 w-3 mr-1" />
              Revoke
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="default"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleApprove}
              disabled={isPending}
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Approve
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger
                render={
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    disabled={isPending}
                  />
                }
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Reject
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reject Design</DialogTitle>
                  <DialogDescription>
                    Provide notes explaining why this design is being rejected.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  placeholder="Enter rejection notes..."
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  rows={3}
                  className="min-h-textarea"
                />
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>
                    Cancel
                  </DialogClose>
                  <Button
                    variant="destructive"
                    onClick={handleRejectConfirm}
                    disabled={!rejectionNotes.trim() || isPending}
                  >
                    Reject
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
