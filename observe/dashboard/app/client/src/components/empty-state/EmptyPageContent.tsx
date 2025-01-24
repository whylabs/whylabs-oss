import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import noDataBackground from '~/assets/noDataBackground.svg';
import noDataCubesLeft from '~/assets/noDataCubesLeft.svg';
import noDataCubesRight from '~/assets/noDataCubesRight.svg';
import { WhyLabsText } from '~/components/design-system';
import { CodeBlock, Language } from '~/components/empty-state/components/CodeBlock';
import React from 'react';

const sidePadding = 20;
const codePadding = 20;
const useStyles = createStyles((_, maxContentWidth: number | undefined) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flexGrow: 1,
    padding: `70px ${sidePadding}px`,
    backgroundImage: `url(${noDataCubesLeft}), url(${noDataCubesRight}), url(${noDataBackground})`,
    backgroundPosition: 'left top, right top, center',
    backgroundRepeat: 'no-repeat, no-repeat, no-repeat',
    backgroundSize: '465px 419px, 261px 367px, cover',
  },
  contentWrap: {
    width: 'auto',
    maxWidth: maxContentWidth ? `${maxContentWidth}px` : '80vw',
    zIndex: 1,
  },
  title: {
    fontFamily: '"Baloo 2"',
    fontSize: 42,
    lineHeight: '56px',
    WebkitBackgroundClip: 'text',
    marginBottom: '20px',
  },
  subtitle: {
    fontSize: 22,
    lineHeight: '30px',
    color: Colors.secondaryLight1000,
    margin: '10px 0 50px',
  },
  imagesWrap: {
    zIndex: 1,
    display: 'grid',
    position: 'relative',
    gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))',
    gap: codePadding,
  },
  code: {
    maxWidth: '92vw',
  },
  codeLabel: {
    fontSize: '16px',
    lineHeight: '24px',
    color: Colors.secondaryLight1000,
    paddingBottom: '6px',
    fontFamily: 'Asap',
  },
}));

export interface EmptyPageContentProps {
  title?: string | React.ReactElement;
  subtitle?: string | React.ReactElement;
  code?: string | React.ReactElement;
  codeLabel?: string | React.ReactElement;
  secondaryCode?: string | React.ReactElement;
  secondaryCodeLabel?: string | React.ReactElement;
  language?: Language;
  footer?: string | React.ReactElement;
  maxContentWidth?: number;
}

export const EmptyPageContent = ({
  maxContentWidth,
  title,
  subtitle,
  code,
  codeLabel = 'Code example',
  secondaryCode,
  secondaryCodeLabel = 'Code example',
  footer,
  language = 'python',
}: EmptyPageContentProps) => {
  const { classes, cx } = useStyles(maxContentWidth);
  return (
    <div className={classes.root}>
      <div className={classes.contentWrap}>
        <div>
          <WhyLabsText className={classes.title}>{title}</WhyLabsText>
          {subtitle && <WhyLabsText className={classes.subtitle}>{subtitle}</WhyLabsText>}
          <div className={classes.imagesWrap}>
            {code && (
              <div className={cx(classes.code)}>
                {codeLabel && <span className={classes.codeLabel}>{codeLabel}</span>}
                <CodeBlock code={code} language={language} />
              </div>
            )}
            {secondaryCode && (
              <div className={classes.code}>
                {secondaryCodeLabel && <span className={classes.codeLabel}>{secondaryCodeLabel}</span>}
                <CodeBlock code={secondaryCode} language={language} />
              </div>
            )}
          </div>
          {footer && (
            <div className={classes.contentWrap}>
              <WhyLabsText className={classes.subtitle}>{footer}</WhyLabsText>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
