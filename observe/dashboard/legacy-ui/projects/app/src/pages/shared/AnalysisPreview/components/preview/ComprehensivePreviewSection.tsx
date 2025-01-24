import { createStyles } from '@mantine/core';
import { WhyLabsCheckboxGroup, WhyLabsText } from 'components/design-system';
import { Colors } from '@whylabs/observatory-lib';

const useStyles = createStyles({
  root: {
    width: '100%',
  },
  title: {
    color: Colors.secondaryLight900,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.14,
  },
  description: {
    color: Colors.gray600,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 1.55,
    fontWeight: 400,
  },
  checkboxLabel: {
    color: Colors.night1,
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.55,
    marginLeft: 3,
  },
});

const ENABLED = 'enabled';

export const ComprehensivePreviewSection = ({
  enabled,
  setEnabled,
  disabled,
}: {
  enabled: boolean;
  setEnabled: (e: boolean) => void;
  disabled?: boolean;
}): React.ReactElement => {
  const { classes } = useStyles();
  const checkboxValues = enabled ? [ENABLED] : [];
  const checkbox = {
    label: <WhyLabsText className={classes.checkboxLabel}>Run on all monitors</WhyLabsText>,
    value: ENABLED,
  };

  const onChange = ([value]: string[]) => {
    const newState = value === ENABLED;
    setEnabled(newState);
  };

  return (
    <div className={classes.root}>
      <WhyLabsText className={classes.title}>Comprehensive preview</WhyLabsText>
      <WhyLabsText className={classes.description}>
        The preview analysis will be applied to all monitors for this resource, over the applied time range.
      </WhyLabsText>
      <WhyLabsCheckboxGroup
        value={checkboxValues}
        disabled={disabled}
        label="Run on all monitors"
        hideLabel
        options={[checkbox]}
        onChange={onChange}
      />
    </div>
  );
};
