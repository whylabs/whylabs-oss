import { createStyles } from '@mantine/core';
import { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Colors } from '~/assets/Colors';
import WhyLabsTextHighlight from '~/components/design-system/text-highlight/WhyLabsTextHighlight';
import WhyLabsTooltip from '~/components/design-system/tooltip/WhyLabsTooltip';
import { InvisibleButton } from '~/components/misc/InvisibleButton';
import { SEARCH_TEXT_QUERY_NAME } from '~/utils/searchParamsConstants';
import { isString } from '~/utils/typeGuards';

const useStyles = createStyles(() => ({
  dataRow: {
    '& *': {
      fontSize: 13,
      fontFamily: 'Inconsolata',
      textWrap: 'nowrap',
    },
  },
  cellPadding: {
    padding: '8px',
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
