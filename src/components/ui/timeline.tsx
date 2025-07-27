import { Timeline as ChakraTimeline } from '@chakra-ui/react';
import * as React from 'react';

export interface TimelineRootProps extends ChakraTimeline.RootProps {
  children: React.ReactNode;
}

export interface TimelineItemProps extends ChakraTimeline.ItemProps {
  children: React.ReactNode;
}

export interface TimelineConnectorProps extends ChakraTimeline.ConnectorProps {
  children: React.ReactNode;
}

export interface TimelineContentProps extends ChakraTimeline.ContentProps {
  children: React.ReactNode;
}

export interface TimelineIndicatorProps extends ChakraTimeline.IndicatorProps {
  children?: React.ReactNode;
}

export interface TimelineTitleProps extends ChakraTimeline.TitleProps {
  children: React.ReactNode;
}

export interface TimelineDescriptionProps extends ChakraTimeline.DescriptionProps {
  children: React.ReactNode;
}

export const TimelineRoot = React.forwardRef<HTMLDivElement, TimelineRootProps>(
  function TimelineRoot(props, ref) {
    const { children, ...rest } = props;
    return (
      <ChakraTimeline.Root ref={ref} {...rest}>
        {children}
      </ChakraTimeline.Root>
    );
  },
);

export const TimelineItem = React.forwardRef<HTMLDivElement, TimelineItemProps>(
  function TimelineItem(props, ref) {
    const { children, ...rest } = props;
    return (
      <ChakraTimeline.Item ref={ref} {...rest}>
        {children}
      </ChakraTimeline.Item>
    );
  },
);

export const TimelineConnector = React.forwardRef<HTMLDivElement, TimelineConnectorProps>(
  function TimelineConnector(props, ref) {
    const { children, ...rest } = props;
    return (
      <ChakraTimeline.Connector ref={ref} {...rest}>
        {children}
      </ChakraTimeline.Connector>
    );
  },
);

export const TimelineSeparator = ChakraTimeline.Separator;

export const TimelineIndicator = React.forwardRef<HTMLDivElement, TimelineIndicatorProps>(
  function TimelineIndicator(props, ref) {
    const { children, ...rest } = props;
    return (
      <ChakraTimeline.Indicator ref={ref} {...rest}>
        {children}
      </ChakraTimeline.Indicator>
    );
  },
);

export const TimelineContent = React.forwardRef<HTMLDivElement, TimelineContentProps>(
  function TimelineContent(props, ref) {
    const { children, ...rest } = props;
    return (
      <ChakraTimeline.Content ref={ref} {...rest}>
        {children}
      </ChakraTimeline.Content>
    );
  },
);

export const TimelineTitle = React.forwardRef<HTMLDivElement, TimelineTitleProps>(
  function TimelineTitle(props, ref) {
    const { children, ...rest } = props;
    return (
      <ChakraTimeline.Title ref={ref} {...rest}>
        {children}
      </ChakraTimeline.Title>
    );
  },
);

export const TimelineDescription = React.forwardRef<HTMLDivElement, TimelineDescriptionProps>(
  function TimelineDescription(props, ref) {
    const { children, ...rest } = props;
    return (
      <ChakraTimeline.Description ref={ref} {...rest}>
        {children}
      </ChakraTimeline.Description>
    );
  },
);

export const Timeline = {
  Root: TimelineRoot,
  Item: TimelineItem,
  Connector: TimelineConnector,
  Separator: TimelineSeparator,
  Indicator: TimelineIndicator,
  Content: TimelineContent,
  Title: TimelineTitle,
  Description: TimelineDescription,
};
