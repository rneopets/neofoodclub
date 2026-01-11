import React, { HTMLAttributes } from 'react';

import { useFormattedDate } from '../../hooks/useFormattedDate';

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
    const { formattedDate, title } = useFormattedDate(date, {
      format,
      fromNow,
      toNow,
      calendar,
      withTitle,
      titleFormat,
      tz,
      interval,
    });

    return (
      <span title={title} {...props}>
        {formattedDate}
      </span>
    );
  },
);

DateFormatter.displayName = 'DateFormatter';

export default DateFormatter;
