import { Checkbox, FormControlLabel, withStyles } from '@material-ui/core';
import { Colors } from '@whylabs/observatory-lib';
import { createStyles } from '@mantine/core';
import { WhyLabsText } from 'components/design-system';

const useStyles = createStyles({
  root: {
    margin: 0,
  },
  rootExpanded: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
  },
  labelTextExpanded: {
    flexGrow: 1,
  },
  disablePadding: {
    padding: 0,
  },
  checkboxContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '5px',
  },
  previewText: {
    fontFamily: 'Asap',
    fontStyle: 'normal',
    fontWeight: 'normal',
    fontSize: '12px',
    lineHeight: '20px',
    marginLeft: '5px',
    textDecoration: 'underline',
    color: Colors.brandPrimary900,
    cursor: 'pointer',
  },
  labelText: {
    fontFamily: 'Asap',
    fontStyle: 'normal',
    fontWeight: 'normal',
    fontSize: '14px',
    lineHeight: '20px',
    marginLeft: '5px',
  },
});

interface LabelCheckboxProps {
  text: string | JSX.Element;
  url?: string;
  checked: boolean;
  hidePreview?: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

/* this has nothing to do with notifications, we should move it to another directory */
export default function LabelCheckbox({
  text,
  url,
  checked,
  hidePreview = false,
  disabled,
  onChange,
}: LabelCheckboxProps): JSX.Element {
  const { classes: styles, cx } = useStyles();
  const showPreview = url && !hidePreview;

  const StyledCheckbox = withStyles({
    root: {
      color: Colors.brandPrimary600,
      '&$checked': {
        color: Colors.brandPrimary600,
      },
    },
    checked: {},
  })((props) => (
    <FormControlLabel
      classes={{
        root: cx(styles.root, !showPreview && styles.rootExpanded),
        label: cx(styles.labelText, !showPreview && styles.labelTextExpanded),
      }}
      control={
        <Checkbox
          color="default"
          {...props}
          classes={{
            root: styles.disablePadding,
          }}
          checked={checked}
          disabled={disabled}
        />
      }
      label={text}
      onChange={(_, isChecked) => {
        onChange(isChecked);
      }}
    />
  ));

  // TODO: Wire in link
  return (
    <div className={styles.checkboxContainer}>
      <StyledCheckbox />
      {showPreview && (
        <WhyLabsText inherit className={styles.previewText}>
          Preview
        </WhyLabsText>
      )}
    </div>
  );
}
