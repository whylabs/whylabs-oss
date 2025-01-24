import { useContext } from 'react';
import { CardHeader } from '@material-ui/core';
import { createStyles } from '@mantine/core';
import { Colors, HtmlTooltip, SafeLink } from '@whylabs/observatory-lib';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import ChartToggler from 'components/chart-toggler/ChartToggler';
import { useAdHoc } from 'atoms/adHocAtom';
import MonitoringMonitorDropdown from 'components/feature-monitor-dropdown/MonitoringMonitorDropdown';
import { getWhyCardDecoration, WhyCardContext } from 'components/cards/why-card/WhyCardContext';
import { AnalysisContext } from 'pages/shared/AnalysisContext';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import { ParsedSegment, simpleStringifySegment } from 'pages/page-types/pageUrlQuery';
import { useResourceContext } from 'pages/model-page/hooks/useResourceContext';
import { ModelType } from 'generated/graphql';
import { CardType } from '../../types';
import { getDefaultToggleSelected, getTogglerItems, handleToggleChange } from './cardHeaderUtils';

interface WhyCardHeaderProps {
  manualColumnId?: string;
  cardType: CardType;
  segment: ParsedSegment;
  isCorrelatedAnomalies?: boolean;
  isOutput?: boolean;
}

const useStyles = createStyles({
  common: {
    fontSize: 16,
    fontWeight: 600,
    flexDirection: 'row',
  },
  alert: {
    color: Colors.red,
  },
  adHoc: {
    color: Colors.chartOrange,
  },
  icon: {
    fill: Colors.red,
  },
  headerStyle: {
    padding: 0,
  },
  tooltipContent: {
    fontSize: 12,
    '& a': {
      color: Colors.brandPrimary300,
    },
  },
  linkStyle: {
    color: Colors.brandPrimary200,
  },
});

const createMonitorIncompatible: CardType[] = ['singleValues', 'output', 'loading'];

const WhyCardHeader: React.FC<WhyCardHeaderProps> = ({
  manualColumnId,
  cardType,
  isCorrelatedAnomalies = false,
  isOutput = false,
  segment,
}) => {
  const { classes: styles, cx } = useStyles();
  const { category } = useResourceText({ DATA: {}, MODEL: {}, LLM: {} });
  const {
    resourceState: { resource },
  } = useResourceContext();
  const showLLMCreateMonitorButton = resource?.type === ModelType.Llm && cardType === 'uniqueValues';
  const [whyState, cardStateDispatch] = useContext(WhyCardContext);
  const { title, tooltipContent } = getWhyCardDecoration(whyState.decorationType, category);
  const { modelId } = usePageTypeWithParams();
  const { getNavUrl } = useNavLinkHandler();
  const [adHocRunId] = useAdHoc();
  const [{ cardsAnalysisResult }] = useContext(AnalysisContext);
  const analysis = cardsAnalysisResult[cardType];
  const hasAnomalies = analysis?.hasAnomalies === true;
  const isSegment = !!segment.tags.length;

  const getFeatureInputLink = () => {
    return getNavUrl({
      page: isOutput ? 'output' : 'columns',
      modelId,
      segmentTags: isSegment ? { tags: segment.tags } : undefined,
      featureName: manualColumnId,
    });
  };

  const renderTitle = (id?: string, displayTitle?: string) => {
    if (isCorrelatedAnomalies) {
      return (
        <>
          <SafeLink sameTab primaryColor href={getFeatureInputLink()} text={id ?? ''} /> - {displayTitle}
        </>
      );
    }
    const cardTitle = cardType === 'drift' && !displayTitle ? 'Drift' : displayTitle;
    return id ? `${id} - ${cardTitle}` : `${cardTitle}`;
  };

  const renderIconButton = () => {
    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'right', width: '100%' }}>
          <MonitoringMonitorDropdown
            showCreateMonitorButton={
              (!createMonitorIncompatible.includes(cardType) && resource?.type !== ModelType.Llm) ||
              showLLMCreateMonitorButton
            }
            analysisResults={whyState.analysisResults}
            analyzer={whyState.analyzer}
            analyzerRecoilKey={`segment--${simpleStringifySegment(segment)}--${cardType}`}
            isCorrelatedAnomalies={isCorrelatedAnomalies}
            cardType={cardType}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'right' }}>
          <ChartToggler
            items={getTogglerItems(whyState)}
            onChange={(selected) => handleToggleChange(selected, whyState, cardStateDispatch)}
            selectedValue={getDefaultToggleSelected(whyState)}
          />
        </div>
      </>
    );
  };

  const cardClassName = (() => {
    if (hasAnomalies && !isCorrelatedAnomalies) {
      return adHocRunId ? styles.adHoc : styles.alert;
    }
    return '';
  })();

  return (
    <div className={styles.headerStyle}>
      <CardHeader
        className={cx(styles.common)}
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ minWidth: '235px', flex: 1 }}>
              <span className={cardClassName}>{renderTitle(manualColumnId, title)}</span>
              {whyState.decorationType !== 'unknown' && tooltipContent && (
                <HtmlTooltip tooltipContent={tooltipContent} />
              )}
            </div>
          </div>
        }
        disableTypography
        action={renderIconButton()}
      />
    </div>
  );
};

export default WhyCardHeader;
