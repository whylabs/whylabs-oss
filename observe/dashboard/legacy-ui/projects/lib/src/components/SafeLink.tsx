import React from 'react';
import { Link } from 'react-router-dom';
import { createStyles } from '@mantine/core';
import { Colors } from '../constants/colors';

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

export type LinkProps = TextLinkProps | ChildLinkProps;

interface CommonLinkProps {
  readonly href: string;

  /**
   * Whether or not to use brand primary colors. Useful if the link is appearing on a light background.
   */
  readonly primaryColor?: boolean;

  /**
   * Whether or not to open in the same tab. Defaults to false.
   */
  readonly sameTab?: boolean;

  readonly className?: string;

  readonly style?: React.CSSProperties;

  /**
   * Some side effect to also take on click
   */
  also?(): void;
}

type TextLinkProps = {
  readonly text: string;
} & CommonLinkProps;

type ChildLinkProps = {
  readonly children: React.ReactNode;
  readonly text?: never;
} & CommonLinkProps;

function isTextLinkProps(props: LinkProps): props is TextLinkProps {
  return typeof props.text === 'string';
}

function getContent(props: LinkProps): React.ReactNode {
  if (isTextLinkProps(props)) {
    return props.text;
  }

  return props.children;
}

/**
 * A link wrapper that contains boilerplate for making a link open in
 * a new tab in a way compliant with our linter settings, which worries about
 * vulnerabilities with _blank.
 */
export function SafeLink(props: LinkProps): JSX.Element {
  const { also, href, primaryColor = true, className, sameTab = false, style } = props;
  const { classes: styles, cx } = useStyles();
  const content = getContent(props);

  return sameTab ? (
    <Link
      className={cx(primaryColor ? styles.primaryColorLink : styles.link, className)}
      style={style}
      to={href}
      onClick={also}
    >
      {content}
    </Link>
  ) : (
    <a
      target="_blank"
      className={cx(primaryColor ? styles.primaryColorLink : styles.link, className)}
      rel="noopener noreferrer"
      href={href}
      onClick={also}
      style={style}
    >
      {content}
    </a>
  );
}
