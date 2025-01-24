import { JsonInput, createStyles } from '@mantine/core';
import { IconArrowsDiagonalMinimize, IconArrowsMoveVertical } from '@tabler/icons';
import { WhyLabsActionIcon, WhyLabsButton } from 'components/design-system';
import { useState } from 'react';
import HCPlaceholder from 'hcplaceholder';
import { HCPlaceholderWrapper } from 'components/visualizations/HCPlaceholderWrapper';

const useStyles = createStyles(() => ({
  root: {
    padding: 20,
  },
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
    justifyContent: 'end',
    marginBottom: 20,
    marginTop: 8,
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
    <div className={classes.root}>
      <h1>Charts playground</h1>
      <div className={classes.jsonEditorContainer}>
        <JsonInput
          autoComplete="off"
          autoCorrect="off"
          error={hasError ? 'Invalid JSON' : undefined}
          formatOnBlur
          label="HCPlaceholder JSON"
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
        <WhyLabsButton onClick={setDashboardFromJSONInput} variant="filled">
          Apply options
        </WhyLabsButton>
      </div>

      {options && <HCPlaceholderWrapper options={options} />}
    </div>
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
      console.error('ChartPlayground getJSONFromValue', error);
      return null;
    }
  }

  function toggleSetIsJsonEditorExpanded() {
    setIsJsonEditorExpanded((prev) => !prev);
  }
};
