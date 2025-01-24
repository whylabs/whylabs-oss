import { useEffect, useState } from 'react';
import { Colors } from '@whylabs/observatory-lib';
import { createStyles } from '@mantine/core';
import { TableFeatureDataType } from 'components/controls/table/profiles-table/types';
import { WhyLabsControlledTabs, WhyLabsDrawer, WhyLabsText } from 'components/design-system';
import { useDeepCompareEffect } from 'hooks/useDeepCompareEffect';
import { uniq } from 'lodash';
import { convertTableTypeToBoxPlotData } from 'components/visualizations/box-plots/boxPlotHelpers';
import { ColoredCategoryData } from 'components/visualizations/OverlaidColumnCharts/OverlaidColumnHighchart';
import { Link } from 'react-router-dom';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useUnifiedBinsTools } from './useUnifiedBinsTools';
import { readableProfileId } from './tableTools';
import { ProfileDataGroup } from './tableTypes';
import { HistogramTabComponent } from './HistogramTabComponent';
import { FrequentItemsTabComponent } from './FrequentItemsTabComponent';
import { ProfilesDescriptionBar } from './ProfilesDescriptionBar';

const useContentAreaStyles = createStyles({
  drawer: {
    paddingLeft: 0,
    paddingRight: 0,
  },
  drawerHeader: {
    backgroundColor: Colors.darkHeader,
    color: Colors.white,
    height: '42px',
    padding: '0 14px 0 9px',
  },
  drawerTitle: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: 'Asap, sans-serif',
    fontWeight: 400,
  },
  drawerLink: {
    textDecoration: 'underline',
    color: Colors.white,
    cursor: 'pointer',
    fontWeight: 600,
  },
  drawerContent: {
    display: 'box',
    height: '100vh',
    maxHeight: '100vh',
    overflow: 'hidden',
  },
  title: {
    fontFamily: 'Asap, sans-serif',
    fontSize: '14px',
    fontWeight: 600,
    lineHeight: '20px',
  },
  closeBox: {
    width: '33px',
    minWidth: '33px',
    height: '33px',
    padding: 0,
    backgroundColor: Colors.white,
    color: Colors.brandSecondary700,
  },
  loader: {
    opacity: 0,
    transition: 'opacity 400ms 200ms',
    marginLeft: 8,
  },
  tabsParent: {
    marginTop: -8,
  },
  tabsPanel: {
    height: '100vh',
    maxHeight: '100vh',
    overflow: 'auto',
    paddingTop: 0,
    paddingRight: 0,
  },
});

interface ProfilesFeaturePanelProps {
  visible: boolean;
  content: TableFeatureDataType[];
  onCloseSidePanel: () => void;
}
type PanelTabValue = 'Histogram' | 'Frequent items';

function tabValueFromString(value: string | null): PanelTabValue {
  if (value === 'Histogram' || value === 'Frequent items') {
    return value;
  }
  return 'Histogram';
}

export default function ProfilesFeaturePanel({
  visible,
  onCloseSidePanel,
  content,
}: ProfilesFeaturePanelProps): JSX.Element | null {
  const { classes: styles } = useContentAreaStyles();

  const {
    amountOfBins,
    setAmountOfBins,
    setData,
    unifiedBinsLoading,
    unifiedCommonYRange,
    commonXDomain,
    unifiedHistograms,
  } = useUnifiedBinsTools();

  const { getNavUrl } = useNavLinkHandler();
  useDeepCompareEffect(() => {
    setData(content);
  }, [content]);

  const { modelId, segment } = usePageTypeWithParams();
  const firstProfileFeatureData = (content?.length ?? 0) > 0 ? content[0] : null; // featureData for each the first profile
  const featureName =
    firstProfileFeatureData && firstProfileFeatureData['feature-name'] ? firstProfileFeatureData['feature-name'] : '';
  const featureNavUrl = getNavUrl({ page: 'columns', featureName, modelId, segmentTags: segment });

  const [loading, setLoading] = useState<boolean>(false);
  const [modernDiscreteChartData, setModernDiscreteChartData] = useState<ColoredCategoryData[]>([]);
  const [categoryList, setCategoryList] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<PanelTabValue>('Histogram');
  const isDefaultDiscrete = firstProfileFeatureData
    ? firstProfileFeatureData['inferred-discretion'].toLowerCase() === 'discrete'
    : false;

  useEffect(() => {
    if (isDefaultDiscrete) {
      setActiveTab('Frequent items');
    } else {
      setActiveTab('Histogram');
    }
  }, [featureName, isDefaultDiscrete]);

  /**
   * Used for generating chartData.
   */
  useEffect(() => {
    const generateChartData = () => {
      const tempHCPlaceholderColumnData: ColoredCategoryData[] = [];
      const duplicatedCategories: string[] = [];
      content.forEach((_, profileIndex: number) => {
        const featureData = content[profileIndex]; // featureData for each profile
        if (!featureData) return;

        // For the new hcplaceholder data types
        const name = `Profile ${profileIndex + 1}`;
        const color = Colors.profilesColorPool[profileIndex % Colors.profilesColorPool.length]; // shouldn't be needed, but just in case
        const data = featureData.featurePanelData.frequentItems.reduce((acc, item) => {
          if (item.value) {
            acc.set(item.value, item.estimate ?? null);
          }
          return acc;
        }, new Map<string, number | null>());
        tempHCPlaceholderColumnData.push({ name, color, data });
        duplicatedCategories.push(...Array.from(data.keys()));
        // End new hcplaceholder data type logic
      });
      const tempHCPlaceholderCategories = uniq(duplicatedCategories); // deduplicate categories
      setCategoryList(tempHCPlaceholderCategories);
      setModernDiscreteChartData(tempHCPlaceholderColumnData);

      setLoading(false);
    };
    setLoading(true);
    setTimeout(generateChartData, 0);
    // We are just referencing the `content`, and we do not manipulate with its data
    // because of that we do not want this hook to depend on it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, setLoading]);

  if (!visible) return null;

  const modernTitle = (
    <WhyLabsText className={styles.drawerTitle}>
      <>
        <span>Column:{` `}</span>
        <Link className={styles.drawerLink} to={featureNavUrl}>
          {featureName}
        </Link>
      </>
    </WhyLabsText>
  );

  const renderTabbedView = (): JSX.Element | null => {
    if (content.length === 0) return null;
    const featureData = content[0]; // featureData for each profile
    if (!featureData) return null;

    const descriptionBarData: ProfileDataGroup[] = content.map((profile, index) => {
      return {
        name: `Profile ${index + 1}`,
        description: readableProfileId(profile?.profileId ?? ''),
        color: profile?.profileColor ?? Colors.profilesColorPool[index % Colors.profilesColorPool.length],
      };
    });
    return (
      <>
        <ProfilesDescriptionBar profiles={descriptionBarData} />
        <WhyLabsControlledTabs
          classNames={{
            tabsParent: styles.tabsParent,
            tabsPanel: styles.tabsPanel,
          }}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tabValueFromString(tab))}
          tabs={[
            {
              label: 'Histogram',
              value: 'Histogram',
              children: (
                <HistogramTabComponent
                  amountOfBins={amountOfBins}
                  setAmountOfBins={setAmountOfBins}
                  commonXDomain={commonXDomain}
                  unifiedCommonYRange={unifiedCommonYRange}
                  unifiedBinsLoading={unifiedBinsLoading}
                  unifiedHistograms={unifiedHistograms}
                  boxPlotData={convertTableTypeToBoxPlotData(content)}
                  loading={loading}
                />
              ),
            },
            {
              label: 'Frequent items',
              value: 'Frequent items',
              children: (
                <FrequentItemsTabComponent
                  categoryList={categoryList}
                  categoryCountData={modernDiscreteChartData}
                  loading={loading}
                />
              ),
            },
          ]}
        />
      </>
    );
  };

  const drawerWidth = 780;

  return (
    <WhyLabsDrawer
      uniqueId="profiles-page-drawer"
      isOpen
      padding={0}
      classNames={{ header: styles.drawerHeader, content: styles.drawerContent }}
      title={modernTitle}
      onClose={onCloseSidePanel}
      size={drawerWidth}
      lockScroll
      withOverlay={false}
      minWidth={500}
    >
      {renderTabbedView()}
    </WhyLabsDrawer>
  );
}
