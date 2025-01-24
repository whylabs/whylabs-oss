import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import externalLinks, { ExternalLinkKeys } from '~/constants/externalLinks';
import { CSSProperties, ReactNode, forwardRef } from 'react';

type ExternalLinkProps = {
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
  to: ExternalLinkKeys;
  id?: string;
};

const useStyles = createStyles({
  link: {
    color: Colors.linkColor,
    '&:visited': {
      color: Colors.linkColor,
    },
  },
});

const ExternalLink = forwardRef<HTMLAnchorElement, ExternalLinkProps>(
  ({ children, to, id, className, ...rest }, ref) => {
    const { classes, cx } = useStyles();
    return (
      <a
        href={externalLinks[to]}
        ref={ref}
        id={id ?? ''}
        target="__blank"
        rel="noopener noreferrer"
        {...rest}
        className={cx(classes.link, className)}
      >
        {children}
      </a>
    );
  },
);

export default ExternalLink;
