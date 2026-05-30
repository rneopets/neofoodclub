import { Box, BoxProps, useToken } from '@chakra-ui/react';
import React from 'react';
import { keyframes, styled } from 'styled-components';

// CSS keyframes for the spinning animation
const spin = keyframes`
  from {
    --angle: 0deg;
  }
  to {
    --angle: 360deg;
  }
`;

const angleProperty = `
  @property --angle {
    syntax: "<angle>";
    initial-value: 0deg;
    inherits: false;
  }
`;

interface CardContainerProps {
  animate?: boolean;
  backgroundColor: string;
  borderColor: string;
  borderRadius: string;
}

const CardContainer = styled(Box).withConfig({
  shouldForwardProp: prop =>
    !['animate', 'backgroundColor', 'borderColor', 'borderRadius'].includes(prop as string),
})<CardContainerProps>`
  ${angleProperty}

  background: ${(props): string => props.borderColor};
  border-radius: ${(props): string => props.borderRadius};
  position: relative;

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    transition: opacity 1s ease;
  }

  &::before {
    z-index: -2;
    height: calc(100% + 2px);
    width: calc(100% + 2px);
    border-radius: ${(props): string => props.borderRadius};

    background: ${(props): string => props.backgroundColor};
  }

  &::after {
    z-index: -1;
    height: calc(100% + 2px);
    width: calc(100% + 2px);
    border-radius: ${(props): string => props.borderRadius};
    background-image: conic-gradient(
      from var(--angle),
      #ff4545,
      #00ff99,
      #006aff,
      #ff0095,
      #ff4545
    );
    opacity: ${(props: CardContainerProps): number => (props.animate ? 1 : 0)};
    animation: ${spin} 3s linear infinite;
  }
`;

interface GlowCardProps extends BoxProps {
  children: React.ReactNode;
  animate?: boolean;
}

const GlowCard: React.FC<GlowCardProps> = ({
  children,
  animate,
  borderRadius = 'lg',
  ...props
}) => {
  const [borderColorValue] = useToken('colors', ['bg.panel']);
  const [backgroundColorValue] = useToken('colors', ['border']);
  const borderRadiusValue = useToken('radii', borderRadius as string);

  return (
    <CardContainer
      animate={animate}
      backgroundColor={backgroundColorValue}
      borderColor={borderColorValue}
      borderRadius={borderRadiusValue}
      {...props}
    >
      {children}
    </CardContainer>
  );
};

export default GlowCard;
