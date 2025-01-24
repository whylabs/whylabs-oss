import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import WhyLabsTextHighlight from '~/components/design-system/text-highlight/WhyLabsTextHighlight';
import WhyLabsTooltip from '~/components/design-system/tooltip/WhyLabsTooltip';
import { InvisibleButton } from '~/components/misc/InvisibleButton';
import { SEARCH_TEXT_QUERY_NAME } from '~/utils/searchParamsConstants';
import { isString } from '~/utils/typeGuards';
import { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

const useStyles = createStyles(() => ({
  dataRow: {
    '& *': {
      lineHeight: 1.4,
      fontSize: 13,
      fontFamily: 'Inconsolata',
      textWrap: 'nowrap',
      maxWidth: '100%',
    },
  },
  cellPadding: {
    padding: '8px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: 1,
  },
  buttonCell: {
    '& *': {
      color: Colors.linkColor,
      textAlign: 'left',
      textDecoration: 'none',
    },
    '&:hover *': {
      textDecoration: 'underline',
      color: Colors.chartPrimary,
    },
  },
}));

export interface InvisibleButtonCellProps {
  children: ReactNode;
  readonly onClick: () => void;
  tooltipText?: string;
  className?: string;
  highlightSearch?: boolean;
  highlightQueryParam?: string;
}
const InvisibleButtonCell = ({
  className,
  tooltipText,
  onClick,
  highlightSearch,
  highlightQueryParam = SEARCH_TEXT_QUERY_NAME,
  children,
}: InvisibleButtonCellProps) => {
  const { classes, cx } = useStyles();
  const [params] = useSearchParams();
  const highlightString = params.get(highlightQueryParam);

  const renderChildren = () => {
    if (highlightSearch && isString(children) && highlightString) {
      return (
        <WhyLabsTextHighlight highlight={highlightString} darkText>
          {children}
        </WhyLabsTextHighlight>
      );
    }
    return children;
  };
  return (
    <InvisibleButton
      className={cx(classes.dataRow, classes.cellPadding, classes.buttonCell, className)}
      onClick={onClick}
    >
      <WhyLabsTooltip label={tooltipText}>{renderChildren()}</WhyLabsTooltip>
    </InvisibleButton>
  );
};

export default InvisibleButtonCell;
