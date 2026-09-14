import React, { ChangeEvent, MouseEvent } from 'react';

import SettingsRow from './SettingsRow';

interface SwitchBoxProps {
  icon: React.ElementType;
  label: string;
  colorPalette: string;
  checked: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement> | MouseEvent<HTMLDivElement>) => void;
  disabled?: boolean;
  tooltipText?: string;
}

const SettingsSwitch: React.FC<SwitchBoxProps> = ({
  icon,
  label,
  colorPalette,
  checked: isChecked,
  onChange,
  disabled,
  tooltipText = undefined,
}) => {
  const settingsRowProps = {
    icon,
    label,
    colorPalette,
    isChecked,
    onChange,
    disabled: disabled ?? false,
    ...(tooltipText && { tooltipText }),
  };

  return <SettingsRow {...settingsRowProps} />;
};

export default SettingsSwitch;
