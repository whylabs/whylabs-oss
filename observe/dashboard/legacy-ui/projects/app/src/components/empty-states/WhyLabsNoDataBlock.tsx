import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import WhyLabsCodeBlock, { Language } from 'components/whylabs-code-block/WhyLabsCodeBlock';

import { WhyLabsText } from 'components/design-system';

const codePadding = 20;
const useStyles = createStyles({
  title: {
    fontFamily: "'Baloo 2'",
    fontSize: 42,
    lineHeight: '56px',
    color: Colors.black,
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
  textWrap: {},
  contentWrap: {},
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
});

export interface WhyLabsNoDataBlockProps {
  title?: string | JSX.Element;
  subtitle?: string | JSX.Element;
  code?: string | JSX.Element;
  codeLabel?: string | JSX.Element;
  secondaryCode?: string | JSX.Element;
  secondaryCodeLabel?: string | JSX.Element;
  language?: Language;
  footer?: string | JSX.Element;
  maxContentWidth?: number;
}

export const WhyLabsNoDataBlock: React.FC<WhyLabsNoDataBlockProps> = ({
  title,
  subtitle,
  code,
  codeLabel = 'Code example',
  secondaryCode,
  secondaryCodeLabel = 'Code example',
  footer,
  language = 'python',
}) => {
  const { classes: styles, cx } = useStyles();
  return (
    <div>
      <WhyLabsText inherit className={styles.title}>
        {title}
      </WhyLabsText>
      {subtitle && (
        <div className={styles.textWrap}>
          <WhyLabsText inherit className={styles.subtitle}>
            {subtitle}
          </WhyLabsText>
        </div>
      )}
      <div className={styles.imagesWrap}>
        {code && (
          <div className={cx(styles.code)}>
            {codeLabel && <span className={styles.codeLabel}>{codeLabel}</span>}
            <WhyLabsCodeBlock code={code} language={language} />
          </div>
        )}
        {secondaryCode && (
          <div className={styles.code}>
            {secondaryCodeLabel && <span className={styles.codeLabel}>{secondaryCodeLabel}</span>}
            <WhyLabsCodeBlock code={secondaryCode} language={language} />
          </div>
        )}
      </div>
      {footer && (
        <div className={styles.contentWrap}>
          <WhyLabsText inherit className={styles.subtitle}>
            {footer}
          </WhyLabsText>
        </div>
      )}
    </div>
  );
};
