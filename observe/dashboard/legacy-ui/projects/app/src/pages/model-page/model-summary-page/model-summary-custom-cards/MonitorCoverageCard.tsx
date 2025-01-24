import { WhyLabsText } from 'components/design-system';
import { atom, useRecoilState } from 'recoil';
import checkMark from 'ui/solid-checkmark.svg';
import { Colors } from '@whylabs/observatory-lib';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { AlertCategory, AssetCategory, Maybe } from 'generated/graphql';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useResourceContext } from 'pages/model-page/hooks/useResourceContext';
import SummaryCard, { CustomCardProps, SummaryCardFooterProps } from '../SummaryCard';
import { useSummaryCardStyles } from '../useModelSummaryCSS';
import TrendMetricSlot from '../model-summary-utils/TrendMetricSlot';

type MonitorCoverageCardAtomState = {
  coveredCategories?: AlertCategory[];
  error: boolean;
  loading: boolean;
};

export const monitorCoverageCardAtom = atom<MonitorCoverageCardAtomState>({
  key: 'monitorCoverageCardAtom',
  default: {
    error: false,
    loading: true,
  },
});

/**
 * Renders the coverage state of the monitor
 * @param isEnabled
 */
const renderCoverageState = (isEnabled: boolean): JSX.Element => {
  if (isEnabled) {
    return <img src={checkMark} alt="checkmark" />;
  }
  return <span style={{ color: Colors.red }}>Not configured</span>;
};

/**
 * Checks if the given category is covered by monitors on this dataset
 * @param category
 * @param coverageState
 */
const categoryIsCovered = (category: AlertCategory, coverageState: MonitorCoverageCardAtomState): boolean => {
  return coverageState.coveredCategories?.includes(category) ?? false;
};

type Coverage = {
  label: string; // Human readable monitoring category label
  isCovered: boolean;
};

const getCoverageOptionsForResource = (
  assetCategory: Maybe<AssetCategory> | undefined,
  monitorCoverageState: MonitorCoverageCardAtomState,
): Coverage[] => {
  // coverage options applicable to all resources
  const baseCoverage: Coverage[] = [
    {
      label: 'Integration monitoring',
      isCovered: categoryIsCovered(AlertCategory.Ingestion, monitorCoverageState),
    },
    {
      label: 'Drift monitoring',
      isCovered: categoryIsCovered(AlertCategory.DataDrift, monitorCoverageState),
    },
    {
      label: 'Data quality monitoring',
      isCovered: categoryIsCovered(AlertCategory.DataQuality, monitorCoverageState),
    },
  ];

  const modelCoverage: Coverage[] = [
    {
      label: 'Performance monitoring',
      isCovered: categoryIsCovered(AlertCategory.Performance, monitorCoverageState),
    },
  ];

  switch (assetCategory) {
    case AssetCategory.Model:
      return [...baseCoverage, ...modelCoverage];
    case AssetCategory.Data:
    default:
      return baseCoverage;
  }
};

export const MonitorCoverageCard = ({ customCard }: { customCard: CustomCardProps }): JSX.Element => {
  const { classes: styles } = useSummaryCardStyles();
  const { getNavUrl } = useNavLinkHandler();
  const { modelId } = usePageTypeWithParams();
  const { category: assetCategory } = useResourceContext().resourceState.resource ?? {};

  const [monitorCoverageState] = useRecoilState(monitorCoverageCardAtom);

  const { loading } = monitorCoverageState;

  const coverage = getCoverageOptionsForResource(assetCategory, monitorCoverageState);

  // total number of covered categories over all categories relevant to this dataset
  const totalCoverage = coverage.filter((c) => c.isCovered).length / coverage.length;

  const footer: SummaryCardFooterProps = {
    footerLink: getNavUrl({ page: 'monitorManager', modelId, monitorManager: { path: 'presets' } }),
    footerTxt: 'Set up monitors',
    footerIcon: true,
  };

  return (
    <SummaryCard
      cardTooltip="A summary of the types of monitors that are currently enabled for this resource."
      customCard={customCard}
      footer={footer}
      cardLoading={loading}
      loadingCardHeight={272}
    >
      <TrendMetricSlot
        currentNumber={totalCoverage}
        isPercent
        hideSummary
        referencedNumber={0}
        title="Total coverage"
      />
      {coverage.map(({ label, isCovered }) => (
        <div key={label}>
          <WhyLabsText inherit className={styles.contentSubtitle}>
            {label}
          </WhyLabsText>
          <WhyLabsText inherit className={styles.contentTxt}>
            {renderCoverageState(isCovered)}
          </WhyLabsText>
        </div>
      ))}
    </SummaryCard>
  );
};
