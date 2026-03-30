'use client';

import * as React from 'react';
import { format, subDays, subMonths, startOfDay, endOfDay, startOfYear } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}

const PRESETS = [
  { label: 'Last 30 days', getDates: () => ({ from: startOfDay(subDays(new Date(), 30)), to: endOfDay(new Date()) }) },
  { label: 'Last 3 months', getDates: () => ({ from: startOfDay(subMonths(new Date(), 3)), to: endOfDay(new Date()) }) },
  { label: 'Last 6 months', getDates: () => ({ from: startOfDay(subMonths(new Date(), 6)), to: endOfDay(new Date()) }) },
  { label: 'Last 12 months', getDates: () => ({ from: startOfDay(subMonths(new Date(), 12)), to: endOfDay(new Date()) }) },
  { label: 'Year to date', getDates: () => ({ from: startOfDay(startOfYear(new Date())), to: endOfDay(new Date()) }) },
] as const;

export function DateRangePicker({ dateRange, onDateRangeChange, className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              'w-[280px] justify-start text-left font-normal',
              !dateRange && 'text-muted-foreground',
              className
            )}
          />
        }
      >
        <CalendarIcon className="mr-2 size-4" />
        {dateRange?.from ? (
          dateRange.to ? (
            <>
              {format(dateRange.from, 'LLL dd, y')} -{' '}
              {format(dateRange.to, 'LLL dd, y')}
            </>
          ) : (
            format(dateRange.from, 'LLL dd, y')
          )
        ) : (
          <span>Pick a date range</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="flex flex-col gap-1 border-r p-3">
            {PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="justify-start text-xs"
                onClick={() => {
                  onDateRangeChange(preset.getDates());
                  setOpen(false);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="p-3">
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={onDateRangeChange}
              numberOfMonths={2}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
