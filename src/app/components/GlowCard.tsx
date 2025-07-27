import { Box, BoxProps } from '@chakra-ui/react';
import React from 'react';
import { styled, keyframes } from 'styled-components';

import { useColorModeValue } from '@/components/ui/color-mode';

const angleProperty = `
  @property --angle {
    syntax: "<angle>";
    initial-value: 0deg;
    inherits: false;
  }
`;

const spin = keyframes`
  from {
    --angle: 0deg;
  }
  to {
    --angle: 360deg;
  }
`;

interface CardContainerProps {
  animate?: boolean;
  backgroundColor: string;
  borderColor: string;
}

const CardContainer = styled(Box).withConfig({
  shouldForwardProp: prop =>
    !['animate', 'backgroundColor', 'borderColor'].includes(prop as string),
})<CardContainerProps>`
  ${angleProperty}

  background: ${props => props.backgroundColor};
  border-radius: 10px;
  position: relative;

  &::before,
  &::after {
    content: '';
    position: absolute;
    height: 100%;
    width: 100%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: -1;
    padding: 1px;
    border-radius: 10px;
    transition: opacity 1s ease;
  }

  &::before {
    filter: ${(props: CardContainerProps): string => (props.animate ? 'blur(0.5rem)' : 'blur(0)')};
    opacity: ${(props: CardContainerProps): number => (props.animate ? 0.7 : 1)};
    background-color: ${props => props.borderColor};
  }

  &::after {
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

const GlowCard: React.FC<GlowCardProps> = ({ children, animate, ...props }) => {
  const backgroundColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <CardContainer
      animate={animate}
      backgroundColor={backgroundColor}
      borderColor={borderColor}
      {...props}
    >
      {children}
    </CardContainer>
  );
};

export default GlowCard;
