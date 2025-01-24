import {
  Button,
  Checkbox,
  ClickAwayListener,
  FormControlLabel,
  List,
  ListItem,
  Popper,
  PopperProps,
} from '@material-ui/core';
import { createStyles } from '@mantine/core';
import { useCommonStyles } from 'hooks/useCommonStyles';
import { Colors } from '@whylabs/observatory-lib';
import { WhyLabsText, WhyLabsTooltip } from 'components/design-system';

const popupStyles = createStyles({
  root: {},
  divider: {
    marginBottom: 12,
  },
  content: {
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    marginTop: 10,
    backgroundColor: Colors.white,
    color: Colors.brandSecondary900,
    border: `1px solid ${Colors.chartPrimary}`,
    boxShadow: `0px 5px 10px rgba(0, 0, 0, 0.15)`,
    borderRadius: 4,
    padding: 20,
    width: 270,
  },
  listItem: {
    padding: 0,
    marginBottom: 12,
  },
  checkbox: {
    height: 24,
    width: 24,
  },
  applyButton: {
    width: '100%',
    textTransform: 'none',
  },
  customLabelRoot: {
    '& .MuiButtonBase-root': {
      padding: '0px 11px',
    },
  },
  noSelect: {
    userSelect: 'none',
    '-webkit-user-select': 'none',
  },
});

export interface CheckboxListItemProps {
  readonly text: string;
  readonly value: string;
  readonly selected?: boolean;
  onChange(value: boolean): void;
}
export function CheckboxListItem({ text, selected, onChange }: CheckboxListItemProps): JSX.Element {
  const { classes: styles, cx } = popupStyles();
  const { classes: commonStyles } = useCommonStyles();
  return (
    <ListItem className={styles.listItem} disableGutters dense>
      <FormControlLabel
        classes={{
          label: cx(commonStyles.largeFont, styles.noSelect),
          root: styles.customLabelRoot,
        }}
        control={
          <Checkbox checked={selected} onChange={(event) => onChange(event.target.checked)} name="" color="primary" />
        }
        label={text}
      />
    </ListItem>
  );
}

export interface CheckboxPopupProps {
  readonly onApply: () => void;
  readonly open: boolean;
  readonly children: React.ReactNode;
  readonly title: string;
  readonly anchorEl: PopperProps['anchorEl'];
  readonly setOpen: (newState: boolean) => void;
  hideApplyButton?: boolean;
  disableButton?: boolean;
  disabledText?: string | undefined;
}

export function CheckboxPopup({
  onApply,
  open,
  children,
  anchorEl,
  title,
  setOpen,
  hideApplyButton = false,
  disableButton = false,
  disabledText,
}: CheckboxPopupProps): JSX.Element {
  const { classes: commonStyles } = useCommonStyles();
  const { classes: styles } = popupStyles();

  return (
    <Popper anchorEl={anchorEl} className={styles.content} open={open} disablePortal placement="bottom-end">
      <ClickAwayListener
        onClickAway={() => {
          // Note: we can't enable portal and use a clickaway listener because of https://github.com/mui-org/material-ui/issues/23215
          if (open) {
            setOpen(false);
          }
        }}
      >
        <div>
          <WhyLabsText inherit className={commonStyles.bolded}>
            {title}
          </WhyLabsText>
          <WhyLabsTooltip label={disableButton && disabledText ? disabledText : ''}>
            <List dense>
              {children}
              {hideApplyButton ? null : (
                <Button onClick={onApply} className={styles.applyButton} variant="outlined" disabled={disableButton}>
                  Apply changes
                </Button>
              )}
            </List>
          </WhyLabsTooltip>
        </div>
      </ClickAwayListener>
    </Popper>
  );
}
