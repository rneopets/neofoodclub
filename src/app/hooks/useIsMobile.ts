import { useBreakpointValue } from '@chakra-ui/react';

export function useIsMobile(): boolean {
  return useBreakpointValue({ base: true, md: false }, { fallback: 'base', ssr: false }) ?? false;
}
