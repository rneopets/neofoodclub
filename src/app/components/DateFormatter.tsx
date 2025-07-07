import React, { useState, useEffect, useCallback, HTMLAttributes } from 'react';

import { formatDate } from '../util';

interface DateFormatterProps extends HTMLAttributes<HTMLSpanElement> {
  date: Date | string | number;
  format?: string;
  fromNow?: boolean;
  toNow?: boolean;
  calendar?: boolean;
  withTitle?: boolean;
  titleFormat?: string;
  tz?: string;
  interval?: number;
}

const DateFormatter = React.memo(
  ({
    date,
    format,
    fromNow,
    toNow,
    calendar,
    withTitle,
    titleFormat,
    tz = 'America/Los_Angeles',
    interval,
    ...props
  }: DateFormatterProps): React.ReactElement => {
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
    useEffect(() => {
      if (!interval) {
        return;
      }

      const timer = setInterval(() => {
        updateDate();
      }, interval * 1000);

      return (): void => clearInterval(timer);
    }, [interval, updateDate, fromNow]);

    return (
      <span title={title} {...props}>
        {formattedDate}
      </span>
    );
  },
);

DateFormatter.displayName = 'DateFormatter';

export default DateFormatter;
