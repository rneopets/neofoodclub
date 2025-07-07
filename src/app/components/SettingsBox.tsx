import { Flex } from '@chakra-ui/react';

// this element is the gray box that contains other elements, for example the "copy markdown code" button

const SettingsBox = (props: React.ComponentProps<typeof Flex>): React.ReactElement => {
  const { background = undefined, children, ...rest } = props;
  const flexProps = {
    align: 'center' as const,
    justify: 'space-between' as const,
    ...(background && { backgroundColor: background }),
    ...rest,
  };

  return <Flex {...flexProps}>{children}</Flex>;
};

export default SettingsBox;
