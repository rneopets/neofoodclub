import { Avatar as ChakraAvatar, AvatarGroup as ChakraAvatarGroup } from '@chakra-ui/react';
import * as React from 'react';

type ImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

export interface AvatarProps extends ChakraAvatar.RootProps {
  ref?: React.Ref<HTMLDivElement>;
  name?: string;
  src?: string;
  srcSet?: string;
  loading?: ImageProps['loading'];
  icon?: React.ReactElement;
  fallback?: React.ReactNode;
}

export function Avatar(props: AvatarProps): React.ReactElement {
  const { name, src, srcSet, loading, icon, fallback, children, ref, ...rest } = props;
  return (
    <ChakraAvatar.Root ref={ref} {...rest}>
      <ChakraAvatar.Fallback name={name}>{icon || fallback}</ChakraAvatar.Fallback>
      <ChakraAvatar.Image src={src} srcSet={srcSet} loading={loading} />
      {children}
    </ChakraAvatar.Root>
  );
}

export const AvatarGroup = ChakraAvatarGroup;
