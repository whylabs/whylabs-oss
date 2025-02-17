import { atom, useRecoilState } from 'recoil';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { Skeleton } from '@mantine/core';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import { timeLong } from 'utils/dateUtils';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import { HtmlTooltip } from '@whylabs/observatory-lib';
import { WhyLabsText } from 'components/design-system';
import { friendlyFormat } from 'utils/numberUtils';
import SummaryCard, { CustomCardProps, SummaryCardFooterProps } from '../SummaryCard';
import { useSummaryCardStyles } from '../useModelSummaryCSS';

const FILE_TEXTS = {
  DATA: {
    featureTitle: 'Columns',
    cardTooltip:
      'Data profiles are generated by whylogs and are used for exploratory data analysis and for monitoring data health',
  },
  MODEL: {
    featureTitle: 'Features',
    cardTooltip:
      'Data profiles are generated by whylogs and are used for exploratory data analysis and for monitoring data health, model health, and model performance',
  },
  LLM: {
    featureTitle: 'Metrics',
    cardTooltip:
      'Data profiles are generated by whylogs and are used for exploratory data analysis and for monitoring data health, model health, and model performance',
  },
};

interface DataProfilesCardState {
  profiles: number[];
  refProfiles: string[];
  loading: boolean;
}

export const dataProfilesCardAtom = atom<DataProfilesCardState>({
  key: 'dataProfilesCardAtom',
  default: {
    profiles: [],
    refProfiles: [],
    loading: false,
  },
});

const refProfileTooltip =
  "Reference profiles won't appear in timeseries graphs because they don't have a timestamp, but they can be used to compare timeseries data against in monitors and they can be compared with other profiles in the profile explorer.";

const DataProfilesCard = ({ customCard }: { customCard: CustomCardProps }): JSX.Element => {
  const { classes: styles } = useSummaryCardStyles();
  const { resourceTexts } = useResourceText(FILE_TEXTS);
  const [{ profiles, refProfiles, loading }] = useRecoilState(dataProfilesCardAtom);
  const { getNavUrl } = useNavLinkHandler();
  const { modelId } = usePageTypeWithParams();

  const footer: SummaryCardFooterProps = {
    footerLink: getNavUrl({ page: 'profiles', modelId }),
    footerTxt: 'Explore profiles',
    footerIcon: true,
  };

  return (
    <SummaryCard
      customCard={customCard}
      cardTooltip={resourceTexts.cardTooltip}
      cardLoading={loading}
      loadingCardHeight={272}
      footer={footer}
    >
      {loading ? (
        <Skeleton height={38} width={40} animate />
      ) : (
        <WhyLabsText inherit>
          <span className={styles.largeInfo}>{friendlyFormat(profiles.length, 3)}</span>
        </WhyLabsText>
      )}
      <hr className={styles.cardDivider} />
      {!loading && refProfiles.length ? (
        <>
          <div>
            <WhyLabsText inherit className={styles.contentSubtitle}>
              Reference profiles
              <HtmlTooltip tooltipContent={refProfileTooltip} topOffset="-9px" />
            </WhyLabsText>
            <WhyLabsText inherit className={styles.contentTxt}>
              {friendlyFormat(refProfiles.length, 3)}
            </WhyLabsText>
          </div>
        </>
      ) : (
        <WhyLabsText inherit className={styles.contentSubtitle}>
          No reference profiles
        </WhyLabsText>
      )}
      {!loading && profiles.length ? (
        <>
          <div>
            <WhyLabsText inherit className={styles.contentSubtitle}>
              First profile
            </WhyLabsText>
            <WhyLabsText inherit className={styles.contentTxt}>
              {timeLong(profiles[0])}
            </WhyLabsText>
          </div>
          <div>
            <WhyLabsText inherit className={styles.contentSubtitle}>
              Last profile
            </WhyLabsText>
            <WhyLabsText inherit className={styles.contentTxt}>
              {timeLong(profiles[profiles.length - 1])}
            </WhyLabsText>
          </div>
        </>
      ) : (
        <WhyLabsText inherit className={styles.contentSubtitle}>
          No recent profiles
        </WhyLabsText>
      )}
      {loading && (
        <>
          <Skeleton height={28} width={40} animate />
          <Skeleton height={22} width={40} animate />
          <Skeleton height={28} width={40} animate />
          <Skeleton height={22} width={40} animate />
        </>
      )}
    </SummaryCard>
  );
};
export default DataProfilesCard;
