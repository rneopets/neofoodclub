import React, { ChangeEvent, MouseEvent } from 'react';

import SettingsRow from './SettingsRow';

interface SwitchBoxProps {
  icon: React.ElementType;
  label: string;
  colorScheme: string;
  isChecked: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement> | MouseEvent<HTMLDivElement>) => void;
  isDisabled?: boolean;
  tooltipText?: string;
}

const MobileSwitchBox: React.FC<SwitchBoxProps> = ({
  icon,
  label,
  colorScheme,
  isChecked,
  onChange,
  isDisabled,
  tooltipText = undefined,
}) => {
  const settingsRowProps = {
    icon,
    label,
    colorScheme,
    isChecked,
    onChange,
    isDisabled: isDisabled ?? false,
    ...(tooltipText && { tooltipText }),
  };

  return <SettingsRow {...settingsRowProps} />;
};

export default MobileSwitchBox;
