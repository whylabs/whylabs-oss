import { Dispatch, SetStateAction } from 'react';
import { createStyles } from '@mantine/core';
import useTypographyStyles from 'styles/Typography';
import { Colors } from '@whylabs/observatory-lib';
import { IconX } from '@tabler/icons';
import { MultiSelectItem } from 'components/panels/monitoring/monitor-manager/custom-monitor/phase-cards/analysis/data-drift/SelectCard/useSelectCardData';
import { InvisibleButton } from 'components/buttons/InvisibleButton';
import useMultiselectCommonStyles from './commonStyles';

const useStyles = createStyles({
  rightSide: {
    width: '363px',
    maxWidth: '363px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    minHeight: '43px',
  },
  text: {
    fontFamily: 'Asap',
    fontSize: '14px',
    lineHeight: '20px',
    color: Colors.secondaryLight1000,
  },
  link: {
    padding: 0,
  },
  selectedItem: {
    fontFamily: 'Asap',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    '& > svg': {
      cursor: 'pointer',
    },
    '& > span': {
      fontSize: '14px',
      lineHeight: '20px',
    },
  },
  selectedItemsContainer: {
    padding: '8px 10px',
    gap: '10px',
    '& p': {
      margin: 0,
    },
  },
  button: {
    width: 'fit-content',
  },
});

interface RightSideProps<T> {
  onChange: Dispatch<SetStateAction<T[]>>;
  selectedItems: T[];
  readonly?: boolean;
  showWeights?: boolean;
}

export default function RightSide<T extends MultiSelectItem>({
  onChange,
  selectedItems,
  readonly,
  showWeights,
}: RightSideProps<T>): JSX.Element {
  const { classes: styles, cx } = useStyles();
  const { classes: typography } = useTypographyStyles();
  const { classes: commonStyles } = useMultiselectCommonStyles();

  const noSelections = selectedItems.length === 0;
  return (
    <div className={cx(styles.rightSide)}>
      <div className={cx(styles.header, commonStyles.wrapperPadding, commonStyles.bottomBorder)}>
        <span className={styles.text}>{selectedItems.length} selected</span>
        {!readonly && (
          <InvisibleButton
            className={cx(
              typography.linkLarge,
              styles.link,
              noSelections ? commonStyles.disabledLink : '',
              styles.button,
            )}
            onClick={() => onChange([])}
          >
            Clear all
          </InvisibleButton>
        )}
      </div>
      <div className={cx(styles.selectedItemsContainer, commonStyles.container)}>
        {selectedItems.length ? (
          selectedItems.map((item) => {
            return (
              <div key={item.id + item.label} className={styles.selectedItem}>
                <span>{item.label}</span>
                {showWeights && (
                  <span className={styles.text} style={{ margin: '0 14px 0 auto' }}>
                    {item.weight}
                  </span>
                )}
                {!readonly && (
                  <InvisibleButton
                    aria-label="Remove item"
                    onClick={() => {
                      if (readonly) return;
                      onChange((prev) => {
                        return prev.filter((i) => i.label !== item.label);
                      });
                    }}
                  >
                    <IconX size={24} color={Colors.brandSecondary500} />
                  </InvisibleButton>
                )}
              </div>
            );
          })
        ) : (
          <p>No items selected...</p>
        )}
      </div>
    </div>
  );
}
