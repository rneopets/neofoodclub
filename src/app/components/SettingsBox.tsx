import { Flex } from '@chakra-ui/react';

// this element is the gray box that contains other elements, for example the "copy markdown code" button

const SettingsBox = (props: React.ComponentProps<typeof Flex>): React.ReactElement => {
  const { background, children, ...rest } = props;

  return (
    <Flex align="center" justify="space-between" bg={background} {...rest}>
      {children}
    </Flex>
  );
};

export default SettingsBox;
