'use client';

import { useState, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, DatesSetArg, EventInput } from '@fullcalendar/core';
import { useQuery } from '@tanstack/react-query';
import { AppointmentSheet } from './appointment-sheet';
import './calendar.css';

// Status color mapping matching StatusBadge patterns
const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  PENDING: { bg: '#fef9c3', border: '#facc15', text: '#854d0e' },
  CONFIRMED: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  SCHEDULED: { bg: '#dbeafe', border: '#60a5fa', text: '#1e40af' },
  IN_PROGRESS: { bg: '#f3e8ff', border: '#a855f7', text: '#6b21a8' },
  COMPLETED: { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
  CANCELLED: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
  NO_SHOW: { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' },
};

function getStatusColor(status: string) {
  return statusColors[status] ?? statusColors.PENDING;
}

interface SerializedAppointment {
  id: string;
  customerId: string;
  artistId: string | null;
  scheduledDate: string;
  duration: number | null;
  status: string;
  type: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  tattooType: string | null;
  size: string | null;
  placement: string | null;
  description: string | null;
  notes: string | null;
  customer: { firstName: string; lastName: string } | null;
  createdAt: string;
  updatedAt: string;
}

function mapToCalendarEvents(appointments: SerializedAppointment[]): EventInput[] {
  return appointments.map((apt) => {
    const customerName = apt.customer
      ? `${apt.customer.firstName} ${apt.customer.lastName}`
      : `${apt.firstName} ${apt.lastName}`;
    const start = new Date(apt.scheduledDate);
    const end = apt.duration ? new Date(start.getTime() + apt.duration * 60000) : undefined;
    const colors = getStatusColor(apt.status);

    return {
      id: apt.id,
      title: customerName,
      start,
      end,
      backgroundColor: colors.bg,
      borderColor: colors.border,
      textColor: colors.text,
      extendedProps: {
        appointmentId: apt.id,
        status: apt.status,
        type: apt.type,
        customerId: apt.customerId,
        customerName,
        email: apt.email,
        phone: apt.phone,
        tattooType: apt.tattooType,
        size: apt.size,
        placement: apt.placement,
        description: apt.description,
        notes: apt.notes,
        duration: apt.duration,
        scheduledDate: apt.scheduledDate,
      },
    };
  });
}

interface CalendarClientProps {
  initialAppointments: SerializedAppointment[];
  initialStart: string;
  initialEnd: string;
}

async function fetchCalendarAppointments(start: string, end: string) {
  const res = await fetch(`/api/admin/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
  if (!res.ok) throw new Error('Failed to fetch calendar data');
  const data = await res.json();
  return data.appointments as SerializedAppointment[];
}

export function CalendarClient({ initialAppointments, initialStart, initialEnd }: CalendarClientProps) {
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ start: initialStart, end: initialEnd });
  const isInitialRender = useRef(true);

  const { data: appointments = initialAppointments } = useQuery({
    queryKey: ['calendar', dateRange.start, dateRange.end],
    queryFn: () => fetchCalendarAppointments(dateRange.start, dateRange.end),
    initialData: isInitialRender.current ? initialAppointments : undefined,
    staleTime: 60 * 1000,
  });

  const events = mapToCalendarEvents(appointments);

  const handleEventClick = useCallback((info: EventClickArg) => {
    setSelectedAppointmentId(info.event.id);
    setSheetOpen(true);
  }, []);

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      const newStart = arg.startStr;
      const newEnd = arg.endStr;

      if (isInitialRender.current) {
        isInitialRender.current = false;
        return;
      }

      setDateRange({ start: newStart, end: newEnd });
    },
    []
  );

  const selectedEvent = events.find((e) => e.id === selectedAppointmentId);

  return (
    <>
      <div className="rounded-lg border bg-card p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={events}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          height="auto"
          eventDisplay="block"
          dayMaxEvents={3}
          nowIndicator
          slotMinTime="08:00:00"
          slotMaxTime="22:00:00"
        />
      </div>

      <AppointmentSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        event={selectedEvent ?? null}
      />
    </>
  );
}
