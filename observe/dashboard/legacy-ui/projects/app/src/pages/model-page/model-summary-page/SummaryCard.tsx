import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import CloseIcon from '@material-ui/icons/Close';
import { HtmlTooltip } from '@whylabs/observatory-lib';
import { Link } from 'react-router-dom';
import { Skeleton as MantineSekeleton } from '@mantine/core';
import { useState } from 'react';
import { WhyLabsText } from 'components/design-system';
import { InvisibleButton } from 'components/buttons/InvisibleButton';
import { useSummaryCardStyles } from './useModelSummaryCSS';

export type SummaryCardFooterProps =
  | {
      footerLink?: string;
      footerLinkNewTab?: boolean;
      footerTxt?: string;
      footerIcon?: boolean;
    }
  | {
      footerHandler: () => void;
      footerTxt?: string;
      footerIcon?: boolean;
    };

interface SummaryCardProps {
  children: React.ReactNode;
  customCard: CustomCardProps;
  infoCard?: boolean;
  enabled?: boolean;
  cardTooltip?: string;
  cardLoading?: boolean;
  loadingCardHeight?: number;
  footer?: SummaryCardFooterProps;
  id?: string | SummaryCardID; // actual element ID
  displaySecureTopBorder?: boolean;
}

export const SUMMARY_CARD_ID = {
  GETTING_STARTED: 'getting-started-summary-card',
  DATA_PROFILES: 'data-profiles-summary-card',
  INPUT_HEALTH: 'columns-health-summary-card',
  LLM_SECURITY: 'llm-security-anomalies-summary-card',
  LLM_PERFORMANCE: 'llm-performance-anomalies-summary-card',
  LLM_SENTIMENT: 'llm-sentiment-anomalies-summary-card',
  LLM_SECURE: 'llm-secure-summary-card',
  SEGMENTS: 'segments-summary-card',
  OUTPUT_HEALTH: 'outputs-health-summary-card',
  MODEL_PERFORMANCE: 'model-performance-summary-card',
  MONITOR_STATUS: 'monitor-status-summary-card',
  ANOMALY_SUMMARY: 'anomaly-summary-card',
  PROJECT: 'resource-details-summary-card',
  EXPLAINABILITY: 'explainability-summary-card',
  INTEGRATION_HEALTH: 'integration-health-summary-card',
  MONITOR_COVERAGE: 'monitor-coverage-summary-card',
} as const;

export type SummaryCardName = keyof typeof SUMMARY_CARD_ID;
export type SummaryCardID = typeof SUMMARY_CARD_ID[SummaryCardName];

export interface CustomCard {
  id: SummaryCardID;
  column: number;
  order: number;
  title: string;
  show: boolean;
}
export interface CustomCardProps extends CustomCard {
  hideCard: ((id: string) => void) | (() => void);
  columnsWrapCurrent?: HTMLDivElement | null;
}
export interface CustomCardComponent {
  id: SummaryCardID;
  Component: ({ customCard }: { customCard: CustomCardProps }) => JSX.Element;
}

const SummaryCard = ({
  displaySecureTopBorder,
  children,
  customCard,
  infoCard = false,
  enabled = true,
  cardTooltip,
  cardLoading = false,
  loadingCardHeight,
  footer,
  id,
}: SummaryCardProps): JSX.Element => {
  const { classes: styles, cx } = useSummaryCardStyles();

  const { footerTxt, footerIcon } = footer ?? {};

  const [isHovered, setIsHovered] = useState(false);
  const CardHeader = () => (
    <>
      <div className={styles.cardHeader}>
        <WhyLabsText inherit className={cx(styles.cardTitle, infoCard && styles.cardTitleInfo)}>
          {customCard.title}
          {cardTooltip && <HtmlTooltip tooltipContent={cardTooltip} />}
        </WhyLabsText>
        <button type="button" className={styles.cardRemoveBtn} onClick={() => customCard.hideCard(customCard.id)}>
          <CloseIcon />
        </button>
      </div>
    </>
  );
  const CardFooter = () => {
    if (!footer) {
      return <MantineSekeleton width="100%" height={20} />;
    }
    if (!footerTxt) {
      return null;
    }

    const LinkWrap = ({ children: linkChildren }: { children: JSX.Element }) => {
      if ('footerHandler' in footer) {
        return (
          <InvisibleButton className={styles.cardLink} onClick={footer.footerHandler}>
            {linkChildren}
          </InvisibleButton>
        );
      }
      const { footerLink, footerLinkNewTab } = footer;
      if (!footerLink && !footerLinkNewTab) {
        return <span className={styles.cardFooterText}>{linkChildren}</span>;
      }
      return footerLinkNewTab ? (
        <a className={styles.cardLink} href={footerLink} target="_blank" rel="noopener noreferrer">
          {linkChildren}
        </a>
      ) : (
        <Link className={styles.cardLink} to={footerLink!}>
          {linkChildren}
        </Link>
      );
    };

    return (
      <LinkWrap>
        <div className={styles.cardFooter}>
          <WhyLabsText inherit className={styles.cardFooterTxt}>
            {footerTxt}{' '}
            {footerIcon && (
              <span className={styles.cardFooterIcon}>
                <ArrowForwardIcon />
              </span>
            )}
          </WhyLabsText>
        </div>
      </LinkWrap>
    );
  };

  const CardElement = () => (
    <div
      className={cx(styles.cardBase, styles.card, styles.cardHover, {
        [styles.cardDisabled]: !enabled,
      })}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-is-hovered={isHovered}
    >
      {displaySecureTopBorder && <div className={styles.securedTopIndicator} />}
      <CardHeader />
      <div className={styles.cardContent}>{children} </div>
      <hr className={styles.cardDivider} />
      <CardFooter />
    </div>
  );

  const CardSkeletonLoader = () => (
    <div className={styles.cardBase} style={{ height: loadingCardHeight }}>
      <MantineSekeleton className={styles.cardSkeleton} width="100%" height={loadingCardHeight} animate />
    </div>
  );

  return (
    <div className={styles.cardWrap} data-handler-id={customCard.id} id={id}>
      {cardLoading ? <CardSkeletonLoader /> : <CardElement />}
    </div>
  );
};

export default SummaryCard;
