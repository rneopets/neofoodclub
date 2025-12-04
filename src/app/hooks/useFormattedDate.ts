import { useState, useEffect, useCallback } from 'react';

import { formatDate } from '../util';
import { useInterval } from './useInterval';

interface UseFormattedDateOptions {
  format?: string;
  fromNow?: boolean;
  toNow?: boolean;
  calendar?: boolean;
  withTitle?: boolean;
  titleFormat?: string;
  tz?: string;
  interval?: number;
}

/**
 * Hook that formats a date and optionally updates it at intervals
 * @param date - The date to format
 * @param options - Formatting options
 * @returns Object with formatted date string and title string
 */
export function useFormattedDate(
  date: Date | string | number,
  options: UseFormattedDateOptions = {},
): { formattedDate: string; title: string } {
  const {
    format,
    fromNow,
    toNow,
    calendar,
    withTitle,
    titleFormat,
    tz = 'America/Los_Angeles',
    interval,
  } = options;

  const [formattedDate, setFormattedDate] = useState<string>('');
  const [title, setTitle] = useState<string>('');

  const updateDate = useCallback(() => {
    if (date) {
      // Filter out undefined values to satisfy exactOptionalPropertyTypes
      const filteredOptions: {
        format?: string;
        fromNow?: boolean;
        toNow?: boolean;
        calendar?: boolean;
        withTitle?: boolean;
        titleFormat?: string;
        tz?: string;
      } = {};

      if (format !== undefined) {
        filteredOptions.format = format;
      }
      if (fromNow !== undefined) {
        filteredOptions.fromNow = fromNow;
      }
      if (toNow !== undefined) {
        filteredOptions.toNow = toNow;
      }
      if (calendar !== undefined) {
        filteredOptions.calendar = calendar;
      }
      if (withTitle !== undefined) {
        filteredOptions.withTitle = withTitle;
      }
      if (titleFormat !== undefined) {
        filteredOptions.titleFormat = titleFormat;
      }
      if (tz !== undefined) {
        filteredOptions.tz = tz;
      }

      setFormattedDate(formatDate(date, filteredOptions));

      if (withTitle && titleFormat) {
        setTitle(formatDate(date, { format: titleFormat, tz }));
      }
    }
  }, [date, format, fromNow, toNow, calendar, withTitle, titleFormat, tz]);

  // Initial format
  useEffect(() => {
    updateDate();
  }, [updateDate]);

  // Set up interval for live updates if interval is provided
  useInterval(updateDate, interval ? interval * 1000 : null);

  return { formattedDate, title };
}
