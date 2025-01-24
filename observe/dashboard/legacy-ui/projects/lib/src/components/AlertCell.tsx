import { Cell } from 'fixed-data-table-2';
import React from 'react';
import { Link } from 'react-router-dom';
import Tooltip from '@material-ui/core/Tooltip';
import { createStyles, Highlight, Text } from '@mantine/core';
import { Colors } from '../constants/colors';

import { RedAlertBall } from './RedAlertBall';

const useCellStyles = createStyles({
  text: {
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    paddingRight: '10px',
  },
  nameColContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  linkCell: {
    color: Colors.linkColor,
    textDecoration: 'underline',
    overflow: 'hidden',
  },
  selected: {
    backgroundColor: Colors.brandPrimary800,
    '& p': {
      color: Colors.white,
      textDecoration: 'underline',
      textDecorationColor: Colors.white,
      fontWeight: 'bolder',
    },
    '&:hover div': {
      backgroundColor: Colors.brandPrimary900,
    },
  },
  nameCol: {
    height: '100%',

    '& .public_fixedDataTableCell_cellContent': {
      padding: 0,
    },
    '& p': {
      fontSize: 13,
    },
  },
  highlight: {
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    '& mark': {
      color: Colors.secondaryLight1000,
    },
  },
});
export interface AlertCellCellProps {
  readonly width: number;
  readonly selected?: boolean;
  readonly to?: string;
  readonly name: string;
  readonly alertCount?: number;
  readonly typographyClassName?: string;
  readonly searchTerm?: string;
}

export const AlertCell: React.FC<AlertCellCellProps> = ({
  name,
  to,
  width,
  alertCount,
  selected,
  typographyClassName,
  searchTerm,
}): JSX.Element => {
  const { classes: styles, cx } = useCellStyles();

  const rootStyles = cx(styles.nameCol, selected ? styles.selected : undefined);
  if (!to) {
    return (
      <Cell className={rootStyles}>
        <div className={styles.nameColContent} style={{ width }}>
          <Tooltip title={`${name}`} placement="right" aria-label={`${name}`}>
            <Text className={cx(styles.text, typographyClassName)}>
              <Highlight className={cx(typographyClassName, styles.highlight)} highlight={searchTerm ?? ''}>
                {name}
              </Highlight>
            </Text>
          </Tooltip>

          {alertCount !== undefined && alertCount > 0 && <RedAlertBall inverted alerts={alertCount} />}
        </div>
      </Cell>
    );
  }

  return (
    <Cell className={rootStyles}>
      <div className={styles.nameColContent} style={{ width }}>
        <Tooltip title={`${name}`} placement="right" aria-label={`${name}`}>
          <Link className={styles.linkCell} to={to}>
            <Text className={cx(styles.text, typographyClassName)}>
              <Highlight className={cx(typographyClassName, styles.highlight)} highlight={searchTerm ?? ''}>
                {name}
              </Highlight>
            </Text>
          </Link>
        </Tooltip>
        {alertCount !== undefined && alertCount > 0 && <RedAlertBall inverted alerts={alertCount} />}
      </div>
    </Cell>
  );
};
