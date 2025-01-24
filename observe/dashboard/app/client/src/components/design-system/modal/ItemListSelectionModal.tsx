import { createStyles } from '@mantine/core';
import { IconGripVertical } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import { WhyLabsButton, WhyLabsModal, WhyLabsSearchInput, WhyLabsText } from '~/components/design-system';
import { useCommonButtonStyles } from '~/components/design-system/button/buttonStyleUtils';
import { ReactElement, ReactNode } from 'react';

export type AvailableItem = { label: string; value: string };

const useStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: 15,
    flex: 1,
  },
  contentRoot: {
    display: 'flex',
    gap: 15,
    height: 'min(650px, 60vh)',
    overflowY: 'auto',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 4,
    background: Colors.secondaryLight100,
    flex: 1,
    padding: 10,
    gap: 10,
    width: 370,
    minWidth: 370,
  },
  emptySectionState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: Colors.secondaryLight1000,
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.2,
    borderRadius: 2,
    border: '2px solid white',
    padding: 16,
    textAlign: 'center',
  },
  sectionTitle: {
    color: Colors.secondaryLight1000,
    fontWeight: 400,
    fontSize: 16,
    lineHeight: 1.125,
  },
  paddingTop5: {
    paddingTop: 5,
  },
  spaceBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listSubTitle: {
    color: Colors.secondaryLight900,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.42,
  },
  itemsWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    flex: 1,
    maxHeight: '60vh',
    overflow: 'auto',
    scrollbarWidth: 'thin',
  },
  itemRoot: {
    background: 'white',
    border: `1px solid #CED4DA`,
    borderRadius: 4,
    display: 'flex',
    height: 36,
    minHeight: 36,
    paddingRight: 10,
    paddingLeft: 6,
    justifyContent: 'space-between',
    alignItems: 'center',
    textOverflow: 'ellipsis',
  },
  itemLabelFlex: {
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
  },
  itemLabel: {
    paddingRight: 10,
    paddingLeft: 4,
    color: Colors.secondaryLight1000,
    fontSize: 13,
    fontWeight: 400,
    letterSpacing: '-0.13px',
    lineHeight: 1.53,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  lockedLabel: {
    color: Colors.secondaryLight500,
  },
  itemButton: {
    height: 24,
    textTransform: 'uppercase',
    padding: 0,
    '&:hover, &:disabled': {
      background: 'transparent',
    },
  },
  space: {
    height: 5,
  },
  buttonGroup: {
    display: 'flex',
    gap: 15,
    justifyContent: 'end',
  },
  buttonPadding: {
    padding: '8px 17px',
  },
});

type CommonSection = {
  title: string;
  listSubTitle: string;
  items: AvailableItem[];
  handler: (v: AvailableItem[]) => void;
  allowComprehensiveTargeting?: boolean;
  emptySelectionMessage?: string;
};

export type ItemListSelectionModalProps = {
  title: ReactNode;
  isOpen: boolean;
  topComponent?: ReactElement;
  bottomComponent?: ReactElement;
  onClose: () => void;
  searchState: {
    value: string;
    setter: (v: string) => void;
  };
  leftSection: CommonSection & {
    disabled?: boolean;
    disabledTooltip?: string;
  };
  rightSection: CommonSection & {
    locked: string[];
  };
  actionsSectionLeftComponent?: ReactElement;
  cancelButton: {
    label: string;
    handler: () => void;
  };
  confirmButton: {
    label: string;
    handler: () => void;
    disabled?: boolean;
    disabledTooltip?: string;
    className?: string;
  };
};

export const ItemListSelectionModal = ({
  isOpen,
  title,
  onClose,
  searchState,
  topComponent,
  bottomComponent,
  actionsSectionLeftComponent,
  leftSection,
  rightSection,
  cancelButton,
  confirmButton,
}: ItemListSelectionModalProps): ReactElement => {
  const { classes, cx } = useStyles();
  const { classes: commonButtonStyles } = useCommonButtonStyles();
  const hasItems = leftSection.items.length + rightSection.items.length;

  const leftSectionComponent = () => {
    const { disabled, disabledTooltip } = leftSection;
    return (
      <div className={classes.section}>
        <WhyLabsText className={classes.sectionTitle}>{leftSection.title}</WhyLabsText>
        <WhyLabsSearchInput
          label="list filter"
          hideLabel
          placeholder="Type to filter the list"
          variant="default"
          value={searchState.value}
          onChange={(value) => searchState.setter(value)}
        />
        <div className={classes.spaceBetween}>
          <WhyLabsText className={classes.listSubTitle}>{leftSection.listSubTitle}</WhyLabsText>
          {leftSection.allowComprehensiveTargeting && (
            <WhyLabsButton
              disabled={!leftSection.items.length}
              variant="subtle"
              color="primary"
              size="xs"
              className={classes.itemButton}
              onClick={() => leftSection.handler(leftSection.items)}
            >
              SELECT ALL
            </WhyLabsButton>
          )}
        </div>
        <div className={classes.itemsWrapper}>
          {leftSection.items.length ? (
            leftSection.items.flatMap((item) => {
              const { label, value } = item;
              return label.toLowerCase().includes(searchState.value.toLowerCase())
                ? [
                    <SelectableItem
                      key={label + value}
                      label={label}
                      action="select"
                      handler={() => leftSection.handler([item])}
                      disabledReason={
                        disabled ? disabledTooltip ?? 'The selection has reached the limit of items' : undefined
                      }
                    />,
                  ]
                : [];
            })
          ) : (
            <div className={classes.emptySectionState}>{hasItems ? 'All items selected' : 'No items available'}</div>
          )}
        </div>
      </div>
    );
  };

  const rightSectionComponent = (
    <div className={classes.section}>
      <WhyLabsText className={classes.sectionTitle}>{rightSection.title}</WhyLabsText>
      <div className={classes.spaceBetween}>
        <WhyLabsText className={cx(classes.listSubTitle, classes.paddingTop5)}>
          {rightSection.listSubTitle} ({rightSection.locked.length + rightSection.items.length}):
        </WhyLabsText>
        {rightSection.allowComprehensiveTargeting && (
          <WhyLabsButton
            disabled={!rightSection.items.length}
            variant="subtle"
            color="primary"
            size="xs"
            className={classes.itemButton}
            onClick={() => rightSection.handler(rightSection.items)}
          >
            REMOVE ALL
          </WhyLabsButton>
        )}
      </div>
      <div className={classes.itemsWrapper}>
        {rightSection.locked.map((label) => (
          <SelectableItem key={label} label={label} locked action="remove" />
        ))}
        {rightSection.items?.length ? (
          rightSection.items.map((item) => {
            const { label, value } = item;
            return (
              <SelectableItem
                key={label + value}
                label={label}
                action="remove"
                handler={() => rightSection.handler([item])}
              />
            );
          })
        ) : (
          <div className={classes.emptySectionState}>{rightSection.emptySelectionMessage ?? 'Nothing selected'}</div>
        )}
      </div>
    </div>
  );

  return (
    <WhyLabsModal opened={isOpen} onClose={onClose} centered size={800} title={title}>
      <div className={classes.root}>
        {topComponent}
        <div className={classes.contentRoot}>
          {leftSectionComponent()}
          {rightSectionComponent}
        </div>
        {bottomComponent}
        <div className={classes.buttonGroup}>
          {actionsSectionLeftComponent}
          <WhyLabsButton
            variant="outline"
            color="gray"
            onClick={cancelButton.handler}
            className={classes.buttonPadding}
          >
            {cancelButton.label}
          </WhyLabsButton>
          <WhyLabsButton
            variant="filled"
            onClick={confirmButton.handler}
            className={cx(confirmButton?.className || commonButtonStyles.gradient, classes.buttonPadding)}
            disabled={confirmButton.disabled}
            disabledTooltip={confirmButton.disabledTooltip}
          >
            {confirmButton.label}
          </WhyLabsButton>
        </div>
      </div>
    </WhyLabsModal>
  );
};

const SelectableItem = ({
  label,
  locked,
  action,
  handler,
  disabledReason,
}: {
  label: string;
  locked?: boolean;
  action: 'select' | 'remove';
  handler?: (v: string) => void;
  disabledReason?: string;
}): ReactElement => {
  const { classes, cx } = useStyles();
  const buttonHandler = () => {
    if (locked) return;
    handler?.(label);
  };
  return (
    <div className={classes.itemRoot}>
      <div className={classes.itemLabelFlex}>
        <IconGripVertical
          size={16}
          style={{ minWidth: 18 }}
          color={locked ? Colors.secondaryLight500 : Colors.secondaryLight1000}
        />
        <WhyLabsText
          displayTooltip={label?.length > 20}
          className={cx(classes.itemLabel, { [classes.lockedLabel]: locked })}
        >
          {label}
        </WhyLabsText>
      </div>
      <WhyLabsButton
        disabled={locked || !!disabledReason}
        variant="subtle"
        color="primary"
        size="xs"
        className={classes.itemButton}
        onClick={buttonHandler}
        disabledTooltip={disabledReason}
      >
        {locked ? 'LOCKED' : action}
      </WhyLabsButton>
    </div>
  );
};
