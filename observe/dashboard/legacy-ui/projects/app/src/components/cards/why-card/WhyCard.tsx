import { useContext } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Card, CardContent } from '@material-ui/core';
import CardErrorFallback from 'pages/errors/boundaries/CardErrorFallback';
import { useAdHoc } from 'atoms/adHocAtom';
import { AlertData } from 'utils/createAlerts';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { ParsedSegment } from 'pages/page-types/pageUrlQuery';
import { CardType } from './types';
import CardContentAndControls from './CardContentAndControls';
import { WhyCardHeader } from './components/card-header';
import { WhyCardContextProvider } from './WhyCardContext';
import useWhyCardStyles from './useWhyCardStyles';
import { CardDataContextProvider } from './CardDataContext';

export interface WhyCardProps {
  cardType: CardType;
  id?: string;
  first?: boolean;
  alertData?: AlertData[];
  manualColumnId?: string;
  isOutput?: boolean;
  segment: ParsedSegment;
  isCorrelatedAnomalies?: boolean;
}

const WhyCard: React.FC<WhyCardProps> = ({
  segment,
  cardType,
  id,
  first = false,
  manualColumnId,
  isOutput = false,
  isCorrelatedAnomalies = false,
}) => {
  const { classes: styles, cx } = useWhyCardStyles();
  const [adHocRunId] = useAdHoc();
  const [{ cardsAnalysisResult }] = useContext(AnalysisContext);
  const hasAnomalies = cardsAnalysisResult[cardType]?.hasAnomalies === true;

  let cardClassName = '';
  if (hasAnomalies && !isCorrelatedAnomalies) {
    cardClassName = adHocRunId ? styles.adHocBorder : styles.alertBorder;
  }

  return (
    <WhyCardContextProvider cardType={cardType}>
      <CardDataContextProvider>
        <Card
          id={id}
          className={cx(
            styles.cardCommon,
            isCorrelatedAnomalies && styles.noBorder,
            first ? styles.firstCard : styles.card,
            cardClassName,
          )}
          variant="outlined"
        >
          <WhyCardHeader
            segment={segment}
            manualColumnId={manualColumnId}
            cardType={cardType}
            isCorrelatedAnomalies={isCorrelatedAnomalies}
            isOutput={isOutput}
          />
          <ErrorBoundary FallbackComponent={CardErrorFallback}>
            <CardContent className={styles.cardContent}>
              <CardContentAndControls
                cardType={cardType}
                manualColumnId={manualColumnId}
                isOutput={isOutput}
                isCorrelatedAnomalies={isCorrelatedAnomalies}
              />
            </CardContent>
          </ErrorBoundary>
        </Card>
      </CardDataContextProvider>
    </WhyCardContextProvider>
  );
};

export default WhyCard;
