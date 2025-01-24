import { Breadcrumbs, Text, createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import React from 'react';
import { Link } from 'react-router-dom';

const useStyles = createStyles({
  text: {
    color: 'white',
    fontFamily: 'Asap',
    fontWeight: 300,
    fontSize: 12,
    lineHeight: 2,
  },
  link: {
    textDecoration: 'underline',
  },
  separator: {
    color: Colors.brandPrimary300,
    fontSize: 16,
    margin: '0 8px',
  },
});

export interface WhyLabsBreadCrumbItem {
  title: string;
  href?: string;
  isMainStackLink?: boolean;
}

type WhyLabsBreadCrumbsProps = {
  items: WhyLabsBreadCrumbItem[];
};

export const WhyLabsBreadCrumbs = ({ items }: WhyLabsBreadCrumbsProps): React.ReactElement => {
  const { classes, cx } = useStyles();

  const mountLink = ({ title, href, isMainStackLink }: WhyLabsBreadCrumbItem) => {
    if (isMainStackLink)
      return (
        <a href={href} className={cx(classes.text, classes.link)} key={title}>
          {title}
        </a>
      );
    return (
      <Link className={cx(classes.text, classes.link)} key={title} to={href ?? ''}>
        {title}
      </Link>
    );
  };

  const children = items.map(({ title, href, isMainStackLink }) => {
    if (href) {
      return mountLink({ title, href, isMainStackLink });
    }
    return (
      <Text className={classes.text} key={title}>
        {title}
      </Text>
    );
  });

  return (
    <Breadcrumbs classNames={{ separator: classes.separator }} data-testid="WhyLabsBreadCrumbs">
      {children}
    </Breadcrumbs>
  );
};
