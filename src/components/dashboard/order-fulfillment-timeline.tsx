'use client';

import { Badge } from '@/components/ui/badge';
import { Check, Truck, PackageCheck, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface OrderFulfillmentTimelineProps {
  currentStatus: string;
  trackingNumber?: string | null;
  trackingCarrier?: string | null;
}

const TIMELINE_STEPS = [
  { status: 'PAID', label: 'Paid', icon: Check },
  { status: 'SHIPPED', label: 'Shipped', icon: Truck },
  { status: 'DELIVERED', label: 'Delivered', icon: PackageCheck },
] as const;

// Map statuses to their progression index (0-based)
const STATUS_INDEX: Record<string, number> = {
  PAID: 0,
  SHIPPED: 1,
  DELIVERED: 2,
};

export function OrderFulfillmentTimeline({
  currentStatus,
  trackingNumber,
  trackingCarrier,
}: OrderFulfillmentTimelineProps) {
  // Terminal states show badge instead of timeline
  if (currentStatus === 'CANCELLED') {
    return (
      <div className="flex items-center justify-center py-4">
        <Badge variant="destructive" className="text-sm px-4 py-1.5">
          Order Cancelled
        </Badge>
      </div>
    );
  }

  if (currentStatus === 'REFUNDED') {
    return (
      <div className="flex items-center justify-center py-4">
        <Badge variant="destructive" className="text-sm px-4 py-1.5">
          Order Refunded
        </Badge>
      </div>
    );
  }

  if (currentStatus === 'PENDING') {
    return (
      <div className="flex items-center justify-center py-4">
        <Badge variant="secondary" className="text-sm px-4 py-1.5">
          Awaiting Payment
        </Badge>
      </div>
    );
  }

  const currentIndex = STATUS_INDEX[currentStatus] ?? -1;

  function copyTrackingNumber() {
    if (trackingNumber) {
      navigator.clipboard.writeText(trackingNumber);
      toast.success('Tracking number copied');
    }
  }

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <nav aria-label="Order fulfillment progress">
        <ol className="flex items-center justify-between">
          {TIMELINE_STEPS.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const Icon = step.icon;

            return (
              <li
                key={step.status}
                className="flex flex-1 items-center"
              >
                {/* Step circle + label */}
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                      isCompleted
                        ? 'border-green-500 bg-green-500 text-white'
                        : isCurrent
                          ? 'border-blue-500 bg-blue-50 text-blue-600 ring-4 ring-blue-100 animate-pulse'
                          : 'border-muted-foreground/30 bg-muted text-muted-foreground/50'
                    }`}
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isCompleted
                        ? 'text-green-600'
                        : isCurrent
                          ? 'text-blue-600'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector line (not after last step) */}
                {index < TIMELINE_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 mt-[-1.25rem] ${
                      index < currentIndex
                        ? 'bg-green-500'
                        : 'bg-muted-foreground/20'
                    }`}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Tracking info */}
      {trackingNumber && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/50 p-3">
          <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            {trackingCarrier && (
              <p className="text-xs text-muted-foreground">{trackingCarrier}</p>
            )}
            <p className="text-sm font-mono truncate">{trackingNumber}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={copyTrackingNumber}
            title="Copy tracking number"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
