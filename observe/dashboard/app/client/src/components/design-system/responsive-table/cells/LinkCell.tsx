import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import WhyLabsTextHighlight from '~/components/design-system/text-highlight/WhyLabsTextHighlight';
import WhyLabsTooltip from '~/components/design-system/tooltip/WhyLabsTooltip';
import { SEARCH_TEXT_QUERY_NAME } from '~/utils/searchParamsConstants';
import { isString } from '~/utils/typeGuards';
import { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { useCommonCellStyles } from './useCommonCellStyles';

const useStyles = createStyles(() => ({
  linkStyle: {
    color: Colors.linkColor,
    textDecoration: 'none',

    '&:hover': {
      textDecoration: 'underline',
      color: Colors.chartPrimary,
    },
  },
}));

export type LinkCellProps = {
  children: ReactNode;
  readonly to: string;
  tooltipText?: string;
  className?: string;
  highlightSearch?: boolean;
  highlightQueryParam?: string;
};

const LinkCell = ({
  to,
  children,
  className = '',
  tooltipText,
  highlightSearch,
  highlightQueryParam = SEARCH_TEXT_QUERY_NAME,
}: LinkCellProps) => {
  const { classes: commonClasses } = useCommonCellStyles();
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
    const linkClassName = cx(commonClasses.common, classes.linkStyle, className);

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
