import { createStyles } from '@mantine/core';
import { Colors, Spacings } from '@whylabs/observatory-lib';
import WhoAmI from 'components/buttons/WhoAmI';
import Breadcrumb from 'components/controls/widgets/breadcrumbs/Breadcrumb';
import SidebarMenuButton from 'components/sidebar/SidebarMenuButton';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { WhyLabsSuperDatePicker } from 'components/super-date-picker/WhyLabsSuperDatePicker';
import { useResourceContext } from 'pages/model-page/hooks/useResourceContext';
import { TimePeriod } from 'generated/graphql';
import { useExtraRangePresets } from 'components/super-date-picker/hooks/useExtraRangePresets';
import { GLOBAL_PICKER_ID } from 'constants/hardcoded';
import { useRecoilState } from 'recoil';
import { SuperDatePickerAtom } from 'atoms/globalPickerAtom';
import { PageType } from 'pages/page-types/pageType';
import { WhyLabsLogo } from './WhyLabsLogo';

const useStyles = createStyles({
  root: {
    display: 'flex',
    backgroundColor: Colors.night1,
  },
  leftSideRoot: {
    display: 'flex',
    flexBasis: 170,
    alignItems: 'center',
    paddingLeft: Spacings.pageLeftPadding,
    paddingTop: 3,
    paddingBottom: 0,
  },
  rightSideRoot: {
    display: 'flex',
    paddingLeft: Spacings.pageLeftPadding,
    justifyContent: 'space-between',
    flex: 1,
    alignItems: 'center',
    marginRight: '8px',
  },
  secondaryContainer: {
    display: 'flex',
    paddingTop: 4,
    gap: 5,
  },
});

export const GLOBAL_TITLE_BAR_HEIGHT = 42 as const;
export const GLOBAL_TAB_BAR_HEIGHT = 70;

export function GlobalTitleBar(): JSX.Element {
  const { classes: styles } = useStyles();
  const { pageType: pt, modelId, segment } = usePageTypeWithParams();
  const {
    resourceState: { resource },
    loading,
  } = useResourceContext();
  const {
    presets: { lineage },
  } = useExtraRangePresets(modelId, segment.tags);

  const shouldShowRangeDatepicker = (pageType: PageType): boolean => {
    const HIDE_RANGE_DATEPICKER_ON_PAGES: PageType[] = [
      'integrationSettings',
      'modelSettings',
      'globalSettings',
      'notifications',
      'userSettings',
      'accessToken',
    ];
    return !HIDE_RANGE_DATEPICKER_ON_PAGES.includes(pageType);
  };
  const [datePickerAtomState, setDatePickerAtom] = useRecoilState(SuperDatePickerAtom);
  const datePickerTimePeriod = (() => {
    if (modelId) return resource?.batchFrequency ?? TimePeriod.P1D;
    return TimePeriod.P1D;
  })();

  if (datePickerAtomState[GLOBAL_PICKER_ID]?.timePeriod !== datePickerTimePeriod) {
    setDatePickerAtom((curr) => ({ ...curr, [GLOBAL_PICKER_ID]: { timePeriod: datePickerTimePeriod } }));
  }

  const renderGlobalDatePicker = () => {
    if (!shouldShowRangeDatepicker(pt)) return null;

    return (
      <WhyLabsSuperDatePicker
        uniqueKey={GLOBAL_PICKER_ID}
        loading={loading}
        timePeriod={datePickerTimePeriod}
        variant="dark"
        presetsListPosition="end"
        hideLabel
        extraPresetList={modelId ? [lineage] : []}
        shouldTruncateRangeIfNeeded
      />
    );
  };

  return (
    <div className={styles.root}>
      <div className={styles.leftSideRoot}>
        <div id="pendo-side-menu-btn">{renderSidebarMenuButton()}</div>
        <WhyLabsLogo />
      </div>

      <div className={styles.rightSideRoot}>
        <Breadcrumb />
        <div className={styles.secondaryContainer}>
          {renderGlobalDatePicker()}
          <WhoAmI />
        </div>
      </div>
    </div>
  );

  function renderSidebarMenuButton() {
    return <SidebarMenuButton />;
  }
}
