import BetAmountsButtons from './BetAmountsButtons';
import SettingsBox from '../ui/SettingsBox';

import { useColorModeValue } from '@/components/ui/color-mode';

// these are the "Set all to max" + copy url buttons

const BetAmountsSettings = (
  props: React.ComponentProps<typeof SettingsBox>,
): React.ReactElement => {
  const { ...rest } = props;
  const gray = useColorModeValue('nfc.gray', 'nfc.grayDark');

  return (
    <SettingsBox bgColor={gray} p={4} {...rest}>
      <BetAmountsButtons />
    </SettingsBox>
  );
};

export default BetAmountsSettings;
