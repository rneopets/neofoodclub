import { Timeline as ChakraTimeline } from '@chakra-ui/react';
import * as React from 'react';

export interface TimelineRootProps extends ChakraTimeline.RootProps {
  children: React.ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}

export interface TimelineItemProps extends ChakraTimeline.ItemProps {
  children: React.ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}

export interface TimelineConnectorProps extends ChakraTimeline.ConnectorProps {
  children: React.ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}

export interface TimelineContentProps extends ChakraTimeline.ContentProps {
  children: React.ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}

export interface TimelineIndicatorProps extends ChakraTimeline.IndicatorProps {
  children?: React.ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}

export interface TimelineTitleProps extends ChakraTimeline.TitleProps {
  children: React.ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}

export interface TimelineDescriptionProps extends ChakraTimeline.DescriptionProps {
  children: React.ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}

export function TimelineRoot(props: TimelineRootProps): React.ReactElement {
  const { children, ref, ...rest } = props;
  return (
    <ChakraTimeline.Root ref={ref} {...rest}>
      {children}
    </ChakraTimeline.Root>
  );
}

export function TimelineItem(props: TimelineItemProps): React.ReactElement {
  const { children, ref, ...rest } = props;
  return (
    <ChakraTimeline.Item ref={ref} {...rest}>
      {children}
    </ChakraTimeline.Item>
  );
}

export function TimelineConnector(props: TimelineConnectorProps): React.ReactElement {
  const { children, ref, ...rest } = props;
  return (
    <ChakraTimeline.Connector ref={ref} {...rest}>
      {children}
    </ChakraTimeline.Connector>
  );
}

export const TimelineSeparator = ChakraTimeline.Separator;

export function TimelineIndicator(props: TimelineIndicatorProps): React.ReactElement {
  const { children, ref, ...rest } = props;
  return (
    <ChakraTimeline.Indicator ref={ref} {...rest}>
      {children}
    </ChakraTimeline.Indicator>
  );
}

export function TimelineContent(props: TimelineContentProps): React.ReactElement {
  const { children, ref, ...rest } = props;
  return (
    <ChakraTimeline.Content ref={ref} {...rest}>
      {children}
    </ChakraTimeline.Content>
  );
}

export function TimelineTitle(props: TimelineTitleProps): React.ReactElement {
  const { children, ref, ...rest } = props;
  return (
    <ChakraTimeline.Title ref={ref} {...rest}>
      {children}
    </ChakraTimeline.Title>
  );
}

export function TimelineDescription(props: TimelineDescriptionProps): React.ReactElement {
  const { children, ref, ...rest } = props;
  return (
    <ChakraTimeline.Description ref={ref} {...rest}>
      {children}
    </ChakraTimeline.Description>
  );
}
