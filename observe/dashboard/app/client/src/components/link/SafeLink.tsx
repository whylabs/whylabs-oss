import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import React from 'react';
import { Link } from 'react-router-dom';

const useStyles = createStyles({
  link: {
    color: Colors.brandPrimary200,
    fontFamily: 'Asap',
  },
  primaryColorLink: {
    color: Colors.linkColor,
    fontFamily: 'Asap',
  },
});

type CommonLinkProps = {
  children: React.ReactNode;
  className?: string;
  href: string;
  /**
   * Whether or not to use brand primary colors. Useful if the link is appearing on a light background.
   */
  primaryColor?: boolean;
  /**
   * Whether or not to open in the same tab. Defaults to false.
   */
  sameTab?: boolean;
  style?: React.CSSProperties;
  /**
   * Some side effect to also take on click
   */
  onClick?(): void;
};

/**
 * A link wrapper that contains boilerplate for making a link open in
 * a new tab in a way compliant with our linter settings, which worries about
 * vulnerabilities with _blank.
 */
export const SafeLink = (props: CommonLinkProps) => {
  const { children, className, href, primaryColor = true, sameTab = false, style, onClick } = props;
  const { classes: styles, cx } = useStyles();

  const commonProps = {
    className: cx(primaryColor ? styles.primaryColorLink : styles.link, className),
    style,
    onClick,
  };

  if (sameTab) {
    return (
      <Link to={href} {...commonProps}>
        {children}
      </Link>
    );
  }

  return (
    <a target="_blank" rel="noopener noreferrer" href={href} {...commonProps}>
      {children}
    </a>
  );
};
