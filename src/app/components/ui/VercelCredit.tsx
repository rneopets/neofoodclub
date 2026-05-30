import { Box } from '@chakra-ui/react';

export function VercelCredit(): React.ReactElement {
  return (
    <Box
      mt="6"
      fontSize="sm"
      fontWeight="semibold"
      display="inline-block"
      bg="black"
      color="white"
      px="4"
      py="2"
      rounded="lg"
    >
      Deployed by
      <span aria-hidden="true">▲</span>
      Vercel
    </Box>
  );
}
