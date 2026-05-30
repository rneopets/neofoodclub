import { Box, Link, Text, Code } from '@chakra-ui/react';

export function GitCommit(): React.ReactElement {
  const commitHash = process.env['REACT_APP_VERCEL_GIT_COMMIT_SHA'] || 'development';
  const shortHash = commitHash.substring(0, 7);

  return (
    <Text fontSize="xs" color="gray.500">
      Commit:
      {commitHash !== 'development' ? (
        <Link
          href={`https://github.com/rneopets/neofoodclub/commit/${commitHash}`}
          target="_blank"
          rel="noopener noreferrer"
          ml={1}
        >
          <Code>{shortHash}</Code>
        </Link>
      ) : (
        <Box as="span" ml={1}>
          {shortHash}
        </Box>
      )}
    </Text>
  );
}
