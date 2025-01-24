import { createStyles } from '@mantine/core';
import { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Colors } from '~/assets/Colors';
import WhyLabsTextHighlight from '~/components/design-system/text-highlight/WhyLabsTextHighlight';
import WhyLabsTooltip from '~/components/design-system/tooltip/WhyLabsTooltip';
import { SEARCH_TEXT_QUERY_NAME } from '~/utils/searchParamsConstants';
import { isString } from '~/utils/typeGuards';

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
  children: ReactNode;
  readonly to: string;
  tooltipText?: string;
  className?: string;
  highlightSearch?: boolean;
  highlightQueryParam?: string;
}
const LinkCell = ({
  to,
  children,
  className = '',
  tooltipText,
  highlightSearch,
  highlightQueryParam = SEARCH_TEXT_QUERY_NAME,
}: LinkCellProps) => {
  const { classes, cx } = useStyles();
  const [params] = useSearchParams();
  const highlightString = params.get(highlightQueryParam);

  const childrenElement = (() => {
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
  })();

  const linkElement = (() => {
    const linkClassName = className || cx(classes.linkCell, classes.linkStyle);

    if (to.startsWith('http')) {
      return (
        <a className={linkClassName} href={to}>
          {childrenElement}
        </a>
      );
    }

    return (
      <Link className={linkClassName} to={to}>
        {childrenElement}
      </Link>
    );
  })();

  return (
    <div>
      <WhyLabsTooltip label={tooltipText}>{linkElement}</WhyLabsTooltip>
    </div>
  );
};

export default LinkCell;
