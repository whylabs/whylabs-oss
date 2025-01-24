import { Link, useSearchParams } from 'react-router-dom';
import WhyLabsTooltip from 'components/design-system/tooltip/WhyLabsTooltip';
import { Colors } from '@whylabs/observatory-lib';
import { createStyles } from '@mantine/core';
import { FilterKeys } from 'hooks/useFilterQueryString';
import { isString } from 'utils/typeGuards';
import WhyLabsTextHighlight from '../../text-highlight/WhyLabsTextHighlight';

const useStyles = createStyles(() => ({
  linkStyle: {
    color: Colors.linkColor,
    textDecoration: 'underline',
    overflow: 'hidden',
    fontFamily: 'Inconsolata',
    fontSize: '13px',
    whiteSpace: 'pre-wrap',
    textOverflow: 'ellipsis',
  },
  linkCell: {
    display: 'block',
    padding: '0 8px',
  },
}));

export interface LinkCellProps {
  readonly to: string;
  tooltipText?: string;
  className?: string;
  highlightSearch?: boolean;
  highlightQueryParam?: string;
}
const LinkCell: React.FC<LinkCellProps> = ({
  to,
  children,
  className = '',
  tooltipText,
  highlightSearch,
  highlightQueryParam = FilterKeys.searchString,
}) => {
  const { classes, cx } = useStyles();
  const [params] = useSearchParams();
  const highlightString = params.get(highlightQueryParam);

  const renderChildren = () => {
    if (highlightSearch && isString(children) && highlightString) {
      return (
        <WhyLabsTextHighlight
          highlight={highlightString}
          className={!className ? classes.linkStyle : undefined}
          darkText
        >
          {children}
        </WhyLabsTextHighlight>
      );
    }
    return children;
  };

  return (
    <div>
      <WhyLabsTooltip label={tooltipText}>
        <Link className={className || cx(classes.linkCell, classes.linkStyle)} to={to}>
          {renderChildren()}
        </Link>
      </WhyLabsTooltip>
    </div>
  );
};

export default LinkCell;
