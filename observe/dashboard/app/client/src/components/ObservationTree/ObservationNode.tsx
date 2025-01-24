import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { useMount } from '~/hooks/useMount';
import { isNumber } from '~/utils/typeGuards';
import { Fragment, useRef } from 'react';

import { InvisibleButton } from '../misc/InvisibleButton';
import { NestedObservationTreeItem } from './types';

const BORDER_RADIUS = 4;

const SELECTED_STYLE = {
  backgroundColor: Colors.brandPrimary700,
  color: Colors.white,
};

const useStyles = createStyles(() => ({
  root: {
    borderRadius: BORDER_RADIUS,
    display: 'flex',
  },
  base: {
    flexDirection: 'column',
  },
  selected: {
    ...SELECTED_STYLE,
    '&:hover': {
      ...SELECTED_STYLE,
    },
  },
  content: {
    borderRadius: BORDER_RADIUS,
    color: Colors.secondaryLight1000,
    padding: 10,
    marginTop: 1,
    width: '100%',
    minWidth: 'fit-content',

    '&:hover': {
      backgroundColor: Colors.brandSecondary100,
    },
  },
  indentationLine: {
    border: `0 solid ${Colors.brandSecondary100}`,
    borderRightWidth: 2,
    marginLeft: 8,
    marginRight: 8,
  },
  activeLevel: {
    borderColor: Colors.brandPrimary700,
  },
}));

export type ObservationNodeProps = {
  indentationLevel: number;
  selectedLevel?: number;
  observations: NestedObservationTreeItem[];
  onChange?: (id: string) => void;
  selectedId?: string | null;
};

export const ObservationNode = ({
  indentationLevel,
  observations,
  selectedLevel,
  ...rest
}: ObservationNodeProps): JSX.Element => {
  const { classes, cx } = useStyles();
  const nodesRef = useRef<Map<string, HTMLDivElement | null>>(new Map());

  useMount(() => {
    if (rest.selectedId) {
      nodesRef.current.get(rest.selectedId)?.scrollIntoView({ behavior: 'smooth' });
    }
  });

  return (
    <>
      {observations.map((observation) => {
        const isSelected = rest.selectedId === observation.id;
        const usedSelectionLevel = (() => {
          if (isNumber(selectedLevel)) return selectedLevel;
          return isSelected ? indentationLevel : undefined;
        })();
        return (
          <Fragment key={observation.id}>
            <div
              className={cx(classes.root, {
                [classes.base]: indentationLevel === 0,
              })}
            >
              {Array.from({ length: indentationLevel }, (_, i) => {
                const isSelectedLevel = i === usedSelectionLevel;
                return (
                  <div className={cx(classes.indentationLine, { [classes.activeLevel]: isSelectedLevel })} key={i} />
                );
              })}
              <InvisibleButton onClick={onSelectObservation(observation.id)}>
                <div
                  className={cx(classes.content, {
                    [classes.selected]: isSelected,
                  })}
                  ref={(el) => nodesRef.current.set(observation.id, el)}
                >
                  {observation.title}
                </div>
              </InvisibleButton>
            </div>
            {!!observation.children?.length && (
              <ObservationNode
                indentationLevel={indentationLevel + 1}
                selectedLevel={usedSelectionLevel}
                observations={observation.children}
                {...rest}
              />
            )}
          </Fragment>
        );
      })}
    </>
  );

  function onSelectObservation(id: string) {
    return () => {
      rest.onChange?.(id);
    };
  }
};
