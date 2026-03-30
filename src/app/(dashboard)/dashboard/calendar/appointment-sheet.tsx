'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import type { EventInput } from '@fullcalendar/core';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Calendar, Clock, User, MapPin, FileText, Palette } from 'lucide-react';

interface AppointmentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventInput | null;
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}

export function AppointmentSheet({ open, onOpenChange, event }: AppointmentSheetProps) {
  const props = event?.extendedProps as Record<string, string | number | null | undefined> | undefined;

  const customerName = props?.customerName as string | undefined;
  const status = props?.status as string | undefined;
  const type = props?.type as string | undefined;
  const scheduledDate = props?.scheduledDate as string | undefined;
  const duration = props?.duration as number | undefined;
  const email = props?.email as string | undefined;
  const phone = props?.phone as string | undefined;
  const tattooType = props?.tattooType as string | undefined;
  const size = props?.size as string | undefined;
  const placement = props?.placement as string | undefined;
  const description = props?.description as string | undefined;
  const notes = props?.notes as string | undefined;

  const formattedDate = scheduledDate
    ? format(new Date(scheduledDate), 'EEEE, MMMM d, yyyy')
    : null;
  const formattedTime = scheduledDate
    ? format(new Date(scheduledDate), 'h:mm a')
    : null;
  const durationText = duration ? `${duration} minutes` : null;
  const typeText = type?.replace(/_/g, ' ') ?? null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{customerName ?? 'Appointment Details'}</SheetTitle>
          <SheetDescription>
            {formattedDate ? `${formattedDate} at ${formattedTime}` : 'Appointment information'}
          </SheetDescription>
          {status && (
            <div className="pt-1">
              <StatusBadge status={status} />
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4">
          <Separator />

          {/* Schedule Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Schedule
            </h3>
            <DetailRow icon={Calendar} label="Date" value={formattedDate} />
            <DetailRow icon={Clock} label="Time" value={formattedTime} />
            <DetailRow icon={Clock} label="Duration" value={durationText} />
            <DetailRow icon={FileText} label="Type" value={typeText} />
          </div>

          <Separator />

          {/* Contact Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Contact
            </h3>
            <DetailRow icon={User} label="Client" value={customerName} />
            {email && (
              <DetailRow icon={User} label="Email" value={email} />
            )}
            {phone && (
              <DetailRow icon={User} label="Phone" value={phone} />
            )}
          </div>

          {/* Tattoo Details */}
          {(tattooType || size || placement || description) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Tattoo Details
                </h3>
                <DetailRow icon={Palette} label="Style" value={tattooType} />
                <DetailRow icon={Palette} label="Size" value={size} />
                <DetailRow icon={MapPin} label="Placement" value={placement} />
                {description && (
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Description</p>
                      <p className="text-sm whitespace-pre-wrap">{description}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Notes */}
          {notes && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Notes
                </h3>
                <p className="text-sm whitespace-pre-wrap">{notes}</p>
              </div>
            </>
          )}
        </div>

        <SheetFooter>
          <Button variant="outline" render={<Link href="/dashboard/appointments" />}>
            View All Appointments
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
