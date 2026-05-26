import { Tooltip as ChakraTooltip, Portal } from '@chakra-ui/react';
import * as React from 'react';

export interface TooltipProps extends ChakraTooltip.RootProps {
  showArrow?: boolean;
  portalled?: boolean;
  portalRef?: React.RefObject<HTMLElement>;
  placement?: NonNullable<ChakraTooltip.RootProps['positioning']>['placement'];
  paddingInline?: ChakraTooltip.ContentProps['paddingInline'];
  content: React.ReactNode;
  contentProps?: ChakraTooltip.ContentProps;
  disabled?: boolean;
  children?: React.ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}

export function Tooltip(props: TooltipProps): React.ReactElement {
  const {
    showArrow,
    children,
    disabled,
    portalled = true,
    content,
    contentProps,
    positioning,
    placement,
    paddingInline,
    portalRef,
    ref,
    ...rest
  } = props;
  const resolvedPositioning = placement ? { ...positioning, placement } : positioning;
  const resolvedContentProps = {
    ...contentProps,
    ...(paddingInline !== undefined && { paddingInline }),
  };

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <ChakraTooltip.Root positioning={resolvedPositioning} {...rest}>
      <ChakraTooltip.Trigger asChild>{children}</ChakraTooltip.Trigger>
      <Portal disabled={!portalled} container={portalRef}>
        <ChakraTooltip.Positioner>
          <ChakraTooltip.Content ref={ref} {...resolvedContentProps}>
            {showArrow && (
              <ChakraTooltip.Arrow>
                <ChakraTooltip.ArrowTip />
              </ChakraTooltip.Arrow>
            )}
            {content}
          </ChakraTooltip.Content>
        </ChakraTooltip.Positioner>
      </Portal>
    </ChakraTooltip.Root>
  );
}
