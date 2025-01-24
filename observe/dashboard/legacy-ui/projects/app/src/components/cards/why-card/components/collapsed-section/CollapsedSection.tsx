import { useContext } from 'react';
import { Button, Collapse } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { IconChevronsLeft, IconChevronsRight } from '@tabler/icons';
import { SELECTED_TIMESTAMP } from 'types/navTags';
import { useQueryParams } from 'utils/queryUtils';
import { WhyCardContext } from '../../WhyCardContext';
import useWhyCardStyles from '../../useWhyCardStyles';
import { CardDataContext } from '../../CardDataContext';

export const CollapsedSection: React.FC = ({ children }) => {
  const { classes: styles, cx } = useWhyCardStyles();
  const { deleteQueryParam } = useQueryParams();
  const [{ showingNoData }] = useContext(WhyCardContext);
  const { cardDataState, goToIndex, setOpened } = useContext(CardDataContext);

  const isOpened = !!cardDataState.selectedProfile || cardDataState.comparisonGraphOpened;
  const handleToggleGraph = () => {
    if (isOpened) {
      goToIndex(null);
      deleteQueryParam(SELECTED_TIMESTAMP);
    } else {
      setOpened(true);
    }
  };
  if (showingNoData) return <div style={{ width: 19 }} />;
  return (
    <div className={cx(styles.paddingContainer, !isOpened ? styles.collapsedPaddingContainer : '')}>
      <div className={styles.dividerContainer}>
        <Button
          variant="subtle"
          styles={(_theme) => ({
            root: {
              radius: 4,
              width: '100%',
              height: '100%',
              padding: 0,
              margin: 0,
              backgroundColor: Colors.transparent,
              color: Colors.brandSecondary900,
              '&:hover': {
                backgroundColor: Colors.transparent,
                color: Colors.secondaryLight1000,
              },
            },
          })}
          onClick={handleToggleGraph}
        >
          {isOpened ? <IconChevronsRight size={8} /> : <IconChevronsLeft size={8} />}
        </Button>
      </div>

      <Collapse in={isOpened} transitionDuration={0}>
        {children}
      </Collapse>
    </div>
  );
};
