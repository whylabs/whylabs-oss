import { createStyles, Skeleton } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { convertAbbreviationToBatchType } from 'adapters/date/timeperiod';
import { WhyLabsText } from 'components/design-system';
import { GetModelProfilesQuery } from 'generated/graphql';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { useUserContext } from 'hooks/useUserContext';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import { atom, useRecoilState } from 'recoil';
import { createCommonTexts } from 'strings/commonTexts';
import { getLabelForModelType } from 'utils/modelTypeUtils';
import { upperCaseFirstLetterOnly } from 'utils/stringUtils';
import { useEnvironment } from 'hooks/useEnvironment';
import SummaryCard, { CustomCardProps, SummaryCardFooterProps } from '../SummaryCard';
import { useSummaryCardStyles } from '../useModelSummaryCSS';

const COMMON_TEXTS = createCommonTexts({
  footerText: 'Explore resources',
  organizationLabel: 'Organization',
  organizationIdLabel: 'Organization ID',
  projectTypeLabel: 'Resource type',
});

const FILE_TEXTS = {
  DATA: {
    ...COMMON_TEXTS,
    idLabel: 'Dataset ID',
    typeLabel: 'Dataset type',
  },
  MODEL: {
    ...COMMON_TEXTS,
    idLabel: 'Model ID',
    typeLabel: 'Model type',
  },
  LLM: {
    ...COMMON_TEXTS,
    idLabel: 'Model ID',
    typeLabel: 'Model type',
  },
};

const useStyles = createStyles(() => ({
  featuredText: {
    color: Colors.chartPrimary,
    fontSize: 16,
    fontFamily: 'Asap, sans-serif',
  },
}));

type ModelQuery = Exclude<GetModelProfilesQuery['model'], null | undefined>;
type ProjectQuery = Omit<ModelQuery, 'batches' | 'referenceProfiles'>;

export interface ProjectCardState {
  model?: ProjectQuery | null;
  loading: boolean;
}

export const projectCardAtom = atom<ProjectCardState>({
  key: 'projectCardAtom',
  default: {
    loading: true,
  },
});

const ProjectCard = ({ customCard }: { customCard: CustomCardProps }): JSX.Element => {
  const { classes: styles } = useSummaryCardStyles();
  const { resourceTexts, category } = useResourceText(FILE_TEXTS);
  const { classes } = useStyles();

  const { getCurrentUser } = useUserContext();
  const user = getCurrentUser();

  const [{ model, loading }] = useRecoilState(projectCardAtom);
  const { getNavUrl } = useNavLinkHandler();

  const content = [
    {
      label: resourceTexts.organizationLabel,
      value: user?.organization?.name ?? '-',
    },
    {
      label: resourceTexts.organizationIdLabel,
      value: user?.organization?.id ?? '-',
    },
    {
      label: resourceTexts.projectTypeLabel,
      value: upperCaseFirstLetterOnly(category),
    },
    {
      label: resourceTexts.typeLabel,
      value: model?.modelType ? getLabelForModelType(model.modelType) : '',
    },
    {
      label: resourceTexts.idLabel,
      value: model?.id,
    },
  ];
  const environment = useEnvironment();
  const showCanned =
    model?.id === 'model-0' && user?.organization?.id === 'org-0' && (environment === 'local' || environment === 'dev');

  const footer: SummaryCardFooterProps = {
    footerLink: getNavUrl({ page: 'home' }),
    footerTxt: resourceTexts.footerText,
    footerIcon: true,
  };

  return (
    <SummaryCard customCard={customCard} footer={footer} cardLoading={loading} loadingCardHeight={272}>
      <WhyLabsText inherit className={classes.featuredText}>
        {model?.name}
      </WhyLabsText>
      <hr className={styles.cardDivider} />
      <div>
        <WhyLabsText inherit className={styles.contentSubtitle}>
          {resourceTexts.batchFrequency}
        </WhyLabsText>
        <WhyLabsText inherit className={classes.featuredText}>
          {convertAbbreviationToBatchType(model?.batchFrequency)}
        </WhyLabsText>
      </div>
      <hr className={styles.cardDivider} />
      {content.map(({ label, value }) => (
        <div key={label}>
          <WhyLabsText inherit className={styles.contentSubtitle}>
            {label}
          </WhyLabsText>
          <WhyLabsText inherit className={styles.contentTxt}>
            {value}
          </WhyLabsText>
        </div>
      ))}
      {showCanned && (
        <>
          <div>
            <WhyLabsText inherit className={styles.contentSubtitle}>
              Version
            </WhyLabsText>
            <WhyLabsText inherit className={styles.contentTxt}>
              wlb-86b1pmda5
            </WhyLabsText>
          </div>
          <div>
            <WhyLabsText inherit className={styles.contentSubtitle}>
              Deployment date
            </WhyLabsText>
            <WhyLabsText inherit className={styles.contentTxt}>
              2024-04-19
            </WhyLabsText>
          </div>
        </>
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
export default ProjectCard;
