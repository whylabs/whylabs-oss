import { Container, Paper } from '@material-ui/core';
import { createStyles } from '@mantine/core';
import React from 'react';
import { WhyLabsLogo } from 'components/controls/widgets/WhyLabsLogo';
import { WhyLabsText } from 'components/design-system';

const gradientRed = '#EA5B4F';
const gradientYellow = '#F9C452';
export const textGradient = `-webkit-linear-gradient(0deg, ${gradientRed} 0%, ${gradientYellow} 100%)`;

const useStyles = createStyles((theme) => ({
  pageRoot: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    height: '100vh',
    width: 'auto',
    position: 'relative',
    padding: theme.spacing.sm,
  },
  alternateRoot: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'start',
    height: '100vh',
    width: 'auto',
    padding: theme.spacing.sm,
    paddingTop: 200,
  },
  contrastTitle: {
    fontFamily: `"Baloo 2"`,
    fontWeight: 600,
    fontSize: 42,
    lineHeight: 1.33,
    marginBottom: 20,
  },
  gradientHeader: {
    background: textGradient,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  logo: {
    alignSelf: 'center',
    justifyContent: 'space-between',
    marginBottom: '70px',
    marginRight: '427px',
  },
  grow: {
    flexGrow: 1,
  },
}));

interface ErrorPageProps {
  pageTitle: string;
  paragraphs?: string[];
  styledHeader?: boolean;
  wide?: boolean;
  rootStyleUpdate?: string;
  showLogo?: boolean;
  showDarkLogo?: boolean;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({
  pageTitle,
  paragraphs,
  children,
  styledHeader = false,
  wide = false,
  rootStyleUpdate = '',
  showLogo = false,
  showDarkLogo = false,
}) => {
  const { classes: styles, cx } = useStyles();

  const createHeader = () => {
    if (!styledHeader) {
      return <h1 style={{ fontFamily: 'Asap' }}>{pageTitle}</h1>;
    }
    return (
      <WhyLabsText inherit className={cx(styles.contrastTitle, styles.gradientHeader)}>
        {pageTitle}
      </WhyLabsText>
    );
  };
  return (
    <Paper variant="outlined" className={cx(styledHeader ? styles.alternateRoot : styles.pageRoot, rootStyleUpdate)}>
      <Container className={styles.grow} maxWidth={wide ? 'md' : 'sm'}>
        {createHeader()}
        {paragraphs?.map((p, pi) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={`error-page-key-${pi}`}>
            <WhyLabsText inherit style={{ textAlign: 'justify', fontFamily: 'Asap' }}>
              {p}
            </WhyLabsText>
            <br />
          </div>
        ))}
        {children}
      </Container>
      {showLogo && <WhyLabsLogo isDark={showDarkLogo} />}
    </Paper>
  );
};
