import { Link } from 'react-router-dom';
import { WhyLabsText } from 'components/design-system';
import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';

export interface LinkedInfo {
  link: string;
  linkTxt: string;
  data: string;
  dataTxt: string;
  key: string;
}

interface LinkedInfoProps {
  linkInfo: LinkedInfo[];
  linkInfoSubtitle?: string | undefined;
}

const useStyles = createStyles(() => ({
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 1,
    color: Colors.brandSecondary700,
    marginBottom: 0,
  },
  cardLink: {
    textDecoration: 'underline',
    color: Colors.linkColor,
  },
  linkInfo: {
    fontSize: 11,
    lineHeight: 1.4,
    color: Colors.linkColor,
    lineBreak: 'anywhere',
    fontFamily: 'Asap',
  },
  linkData: {
    fontSize: 12,
    lineHeight: 1.4,
    display: 'block',
    color: Colors.secondaryLight1000,
  },
}));

export default function LinkedInfoMetricSlot({ linkInfo, linkInfoSubtitle }: LinkedInfoProps): JSX.Element {
  const { classes, cx } = useStyles();

  return (
    <>
      {linkInfoSubtitle && <WhyLabsText className={classes.cardSubtitle}>{linkInfoSubtitle}</WhyLabsText>}
      {linkInfo.map(({ link, linkTxt, data, dataTxt, key }) => (
        <WhyLabsText key={`link-info-${key}`} size={12} pt={4}>
          <Link className={cx(classes.cardLink, classes.linkInfo)} to={link}>
            {linkTxt}
          </Link>
          <span className={classes.linkData}>{`${data} ${dataTxt}`}</span>
        </WhyLabsText>
      ))}
    </>
  );
}
