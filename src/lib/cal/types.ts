export interface CalWebhookEvent {
  triggerEvent: 'BOOKING_CREATED' | 'BOOKING_RESCHEDULED' | 'BOOKING_CANCELLED';
  createdAt: string;
  payload: CalBookingPayload;
}

export interface CalBookingPayload {
  uid: string;
  bookingId: number;
  title: string;
  type: string;
  status: string;
  eventTypeId: number;
  startTime: string;
  endTime: string;
  length: number;
  description: string | null;
  location: string | null;
  organizer: {
    id: number;
    name: string;
    email: string;
    username: string;
    timeZone: string;
    language: { locale: string };
    timeFormat: string;
    utcOffset: number;
  };
  attendees: Array<{
    name: string;
    email: string;
    timeZone: string;
    language: { locale: string };
  }>;
  responses: {
    name?: { value: string } | string;
    email?: { value: string } | string;
    phone?: { value: string };
    notes?: { value: string };
    guests?: { value: string[] };
    rescheduleReason?: { value: string };
    location?: { value: string; optionValue: string };
  };
  metadata: Record<string, unknown> & {
    videoCallUrl?: string;
  };
  videoCallData?: { url?: string };
  rescheduleUid?: string;
  rescheduleId?: number;
  rescheduleStartTime?: string;
  rescheduleEndTime?: string;
  cancellationReason?: string;
}
