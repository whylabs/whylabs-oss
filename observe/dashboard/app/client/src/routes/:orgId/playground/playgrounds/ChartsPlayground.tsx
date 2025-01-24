import { JsonInput, createStyles } from '@mantine/core';
import { IconArrowsDiagonalMinimize, IconArrowsMoveVertical } from '@tabler/icons-react';
import { ChartCard } from '~/components/chart/ChartCard';
import { HCPlaceholderWrapper } from '~/components/chart/HCPlaceholderWrapper';
import { WhyLabsActionIcon, WhyLabsButton } from '~/components/design-system';
import LogRocket from 'logrocket';
import { JSX, useState } from 'react';

import { chartPlaygroundPresets } from './chartPlaygroundPresets';

const useStyles = createStyles(() => ({
  jsonEditorContainer: {
    alignItems: 'end',
    display: 'flex',
    flexDirection: 'row',

    '& > div:nth-child(1)': {
      flexGrow: 1,
    },
    '& > div:nth-child(2)': {
      flexGrow: 0,
    },
  },
  buttonsContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  presetButtonsContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: 4,
  },
}));

export const ChartsPlayground = (): JSX.Element => {
  const { classes } = useStyles();

  const [value, setValue] = useState('');
  const [isJsonEditorExpanded, setIsJsonEditorExpanded] = useState(false);
  const [options, setOptions] = useState<HCPlaceholder.Options | null>(null);

  const hasError = value && !getJSONFromValue();

  const rows = isJsonEditorExpanded ? 30 : 10;

  return (
    <>
      <div className={classes.jsonEditorContainer}>
        <JsonInput
          autoComplete="off"
          autoCorrect="off"
          error={hasError ? 'Invalid JSON' : undefined}
          formatOnBlur
          label="JSON preset"
          maxRows={rows}
          minRows={rows}
          onChange={setValue}
          validationError="Invalid JSON"
          value={value}
        />
        <WhyLabsActionIcon
          label={isJsonEditorExpanded ? 'Collapse editor' : 'Expand editor'}
          onClick={toggleSetIsJsonEditorExpanded}
        >
          {isJsonEditorExpanded ? (
            <IconArrowsDiagonalMinimize style={{ transform: 'rotate(45deg)' }} />
          ) : (
            <IconArrowsMoveVertical />
          )}
        </WhyLabsActionIcon>
      </div>
      <div className={classes.buttonsContainer}>
        <div className={classes.presetButtonsContainer}>
          {chartPlaygroundPresets.map((preset, index) => (
            <WhyLabsButton key={preset.id} onClick={onSelectPreset(preset)} size="xs" variant="outline">
              Preset {index + 1}
            </WhyLabsButton>
          ))}
        </div>

        <WhyLabsButton onClick={setDashboardFromJSONInput} variant="filled">
          Apply preset
        </WhyLabsButton>
      </div>
      {options && (
        <ChartCard>
          <HCPlaceholderWrapper description="Custom chart made by the settings on the playground" options={options} />
        </ChartCard>
      )}
    </>
  );

  function setDashboardFromJSONInput() {
    const validJson = getJSONFromValue();
    setOptions(validJson);
  }

  function getJSONFromValue(): HCPlaceholder.Options | null {
    if (!value) return null;

    try {
      const validJson = JSON.parse(value);
      return validJson as HCPlaceholder.Options;
    } catch (error) {
      LogRocket.error('ChartPlayground getJSONFromValue', error);
      return null;
    }
  }

  function onSelectPreset(preset: HCPlaceholder.Options) {
    return () => {
      setValue(JSON.stringify(preset, null, 2));
    };
  }

  function toggleSetIsJsonEditorExpanded() {
    setIsJsonEditorExpanded((prev) => !prev);
  }
};
