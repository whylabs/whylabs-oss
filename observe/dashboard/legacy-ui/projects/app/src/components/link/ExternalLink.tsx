import { createStyles } from '@mantine/core';
import { CSSProperties } from '@material-ui/core/styles/withStyles';
import { Colors } from '@whylabs/observatory-lib';
import externalLinks, { ExternalLinkKeys } from 'constants/externalLinks';
import { forwardRef, ReactNode } from 'react';

const useStyles = createStyles(() => ({
  anchor: {
    color: Colors.linkColor,
  },
}));

type ExternalLinkProps = {
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
  to: ExternalLinkKeys;
  id?: string;
};

const ExternalLink = forwardRef<HTMLAnchorElement, ExternalLinkProps>(
  ({ children, className, to, id, ...rest }, ref) => {
    const { classes, cx } = useStyles();
    return (
      <a
        className={cx(classes.anchor, className)}
        href={externalLinks[to]}
        ref={ref}
        id={id ?? ''}
        target="__blank"
        rel="noopener noreferrer"
        {...rest}
      >
        {children}
      </a>
    );
  },
);

export default ExternalLink;
