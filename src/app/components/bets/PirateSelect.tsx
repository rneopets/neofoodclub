import { Select, Text, createListCollection, useSelectContext } from '@chakra-ui/react';
import React, { useMemo } from 'react';

import { PIRATE_NAMES } from '../../constants';
import { useGetPirateBgColor } from '../../hooks/useGetPirateBgColor';
import { usePiratesForArena, useRoundOpeningOdds } from '../../stores';

const CustomValueText = React.memo(() => {
  const select = useSelectContext();
  const items = select.selectedItems;
  const isNoPirate = items.length > 0 && items[0]?.value === '0';

  if (items.length === 0) {
    return <Select.ValueText placeholder="Select pirate..." />;
  }

  return (
    <Select.ValueText>
      <Text
        as="span"
        color={isNoPirate ? 'fg.muted' : undefined}
        fontStyle={isNoPirate ? 'italic' : undefined}
      >
        {select.collection.stringifyItem(items[0])}
      </Text>
    </Select.ValueText>
  );
});

CustomValueText.displayName = 'CustomValueText';

interface PirateSelectProps {
  arenaId: number;
  pirateValue: number;
  includeNoPirate?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  [key: string]: unknown;
}

const PirateSelect = React.memo(
  (props: PirateSelectProps): React.ReactElement => {
    const { arenaId, pirateValue, includeNoPirate = true, onChange, ...rest } = props;
    const getPirateBgColor = useGetPirateBgColor();

    const openingOdds = useRoundOpeningOdds();

    const pirates = usePiratesForArena(arenaId);

    const currentOpeningOdds = openingOdds[arenaId]?.[pirateValue] as number;

    const bgColor = pirateValue !== 0 ? getPirateBgColor(currentOpeningOdds) : undefined;

    const collection = useMemo(() => {
      if (!pirates) {
        return createListCollection({ items: [] });
      }

      const items = [
        ...(includeNoPirate ? [{ label: '[no pirate]', value: '0' }] : []),
        ...pirates.map((pirateId: number, pirateIndex: number) => ({
          label: PIRATE_NAMES.get(pirateId) || '',
          value: String(pirateIndex + 1),
        })),
      ];

      return createListCollection({ items });
    }, [pirates, includeNoPirate]);

    const handleValueChange = useMemo(() => {
      if (!onChange) {
        return;
      }

      return (details: { value: string[] }): void => {
        // If value is empty array (deselected) or contains "0", treat as "0"
        const value =
          details.value.length === 0 || details.value[0] === '0' ? '0' : details.value[0];
        // Create a synthetic event to match the expected onChange signature
        const syntheticEvent = {
          target: { value },
        } as React.ChangeEvent<HTMLSelectElement>;
        onChange(syntheticEvent);
      };
    }, [onChange]);

    if (!pirates) {
      return (
        <Select.Root disabled collection={collection} size="xs" {...rest}>
          <Select.HiddenSelect />
          <Select.Control>
            <Select.Trigger>
              <Select.ValueText placeholder="Loading..." />
            </Select.Trigger>
            <Select.IndicatorGroup>
              <Select.Indicator />
            </Select.IndicatorGroup>
          </Select.Control>
        </Select.Root>
      );
    }

    return (
      <Select.Root
        collection={collection}
        size="xs"
        value={
          pirateValue === 0
            ? includeNoPirate
              ? ['0']
              : []
            : [String(pirateValue)]
        }
        onValueChange={handleValueChange}
        deselectable
        minW="120px"
        positioning={{ sameWidth: true }}
        {...(bgColor && { colorPalette: bgColor })}
        {...rest}
      >
        <Select.HiddenSelect />
        <Select.Control {...(bgColor && { layerStyle: 'fill.subtle', colorPalette: bgColor })}>
          <Select.Trigger>
            <CustomValueText />
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {collection.items.map((item: { value: string; label: string }) => {
              const isNoPirate = item.value === '0';
              const pirateValueNum = item.value === '0' ? null : parseInt(item.value);
              const itemOpeningOdds =
                pirateValueNum !== null ? openingOdds[arenaId]?.[pirateValueNum] : undefined;
              const itemBgColor =
                pirateValueNum !== null && itemOpeningOdds
                  ? getPirateBgColor(itemOpeningOdds)
                  : undefined;
              return (
                <Select.Item
                  item={item}
                  key={item.value}
                  {...(itemBgColor && { layerStyle: 'fill.subtle', colorPalette: itemBgColor })}
                >
                  <Select.ItemText>
                    <Text
                      as="span"
                      color={isNoPirate ? 'fg.muted' : undefined}
                      fontStyle={isNoPirate ? 'italic' : undefined}
                    >
                      {item.label}
                    </Text>
                  </Select.ItemText>
                  <Select.ItemIndicator />
                </Select.Item>
              );
            })}
          </Select.Content>
        </Select.Positioner>
      </Select.Root>
    );
  },
  (prevProps, nextProps) =>
    prevProps.arenaId === nextProps.arenaId &&
    prevProps.pirateValue === nextProps.pirateValue &&
    prevProps.onChange === nextProps.onChange,
);

PirateSelect.displayName = 'PirateSelect';

export default PirateSelect;
