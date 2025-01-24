import React from 'react';
import { Link } from 'react-router-dom';
import { List, Tooltip } from '@material-ui/core';
import { createStyles, Highlight } from '@mantine/core';
import { stringMax } from '../util/stringUtils';
import { TextCell } from './TextCell';
import { Colors } from '../constants/colors';

const useStyles = createStyles({
  linkCell: {
    color: Colors.linkColor,
    textDecoration: 'underline',
    overflowWrap: 'anywhere',
  },
  wrapper: {
    margin: '2px 0',
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

export interface LinkCellProps {
  readonly to: string;
  readonly maxChars?: number;
  readonly children: string[];
  readonly searchTerm?: string;
  withTooltip?: boolean;
  className?: string;
}
export function LinkCell({
  to,
  children,
  maxChars,
  className = '',
  withTooltip = false,
  searchTerm,
}: LinkCellProps): JSX.Element {
  const { classes: styles, cx } = useStyles();

  return (
    <TextCell disableCaps>
      <List>
        {children.map((child) => {
          const linkElement = (
            <Link className={cx(styles.linkCell, className)} key={child} to={to}>
              <Highlight className={styles.highlight} highlight={searchTerm ?? ''}>
                {stringMax(child, maxChars)}
              </Highlight>
            </Link>
          );

          if (withTooltip) {
            return (
              <Tooltip key={child} title={child} placement="right">
                {linkElement}
              </Tooltip>
            );
          }

          return linkElement;
        })}
      </List>
    </TextCell>
  );
}
