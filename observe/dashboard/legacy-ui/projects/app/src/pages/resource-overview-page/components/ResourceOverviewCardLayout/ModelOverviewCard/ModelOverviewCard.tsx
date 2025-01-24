import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { AssetCategory, ModelOverviewInfoFragment, ModelType } from 'generated/graphql';
import { Link } from 'react-router-dom';
import { convertAbbreviationToBatchType } from 'adapters/date/timeperiod';
import { isItModelOrDataTransform } from 'utils/modelTypeUtils';
import { ModelSortBy, SortDirectionType } from 'hooks/useSort/types';
import { IconShieldCheck, IconSortAscending, IconSortDescending } from '@tabler/icons';
import { WhyLabsText, WhyLabsTextHighlight, WhyLabsTooltip } from 'components/design-system';
import { isNumber } from 'utils/typeGuards';
import { getFunctionsForTimePeriod } from 'utils/batchProfileUtils';
import { Colors } from '@whylabs/observatory-lib';
import { InvisibleButton } from 'components/buttons/InvisibleButton';
import { useMountLlmSecureUrl } from 'hooks/useNewStackLinkHandler';
import { useCardLayoutStyles } from '../useResourceOverviewCardLayoutCSS';
import CardResourceName from '../CardResourceName';
import CardResourceType from '../CardResourceType';
import ProfilesRangeCard from '../ProfilesRangeCard';
import { CardResourceFreshness } from '../CardResourceFreshness';
import { CardResourceAnomaliesInRange } from '../CardResourceAnomaliesInRange';
import { CardResourceLatestProfileWithAnomaly } from '../CardResourceLatestProfileWithAnomaly';
import { CardResourceTags } from '../CardResourceTags';

interface ModelOverviewCardProperties {
  model: ModelOverviewInfoFragment;
  sortBy?: ModelSortBy;
  sortByDirection?: SortDirectionType;
  readonly searchTerm?: string;
  addResourceTagToFilter: (t: string[]) => void;
}

const getResourceName = new Map<AssetCategory, string>([
  [AssetCategory.Model, 'Model'],
  [AssetCategory.Data, 'Dataset'],
  [AssetCategory.Llm, 'LLM'],
]);

const ModelOverviewCard: React.FC<ModelOverviewCardProperties> = ({
  model,
  sortBy,
  sortByDirection,
  searchTerm,
  addResourceTagToFilter,
}) => {
  const { classes } = useCardLayoutStyles();
  const { mountLlmTracesUrl } = useMountLlmSecureUrl();
  const mountFieldSortTooltip = (headerText?: string): React.ReactNode => {
    if (!sortBy) return '';
    const isAsc = sortByDirection === 'ASC';
    const directionLabel = isAsc ? 'ascending' : 'descending';
    const DirectionIcon = isAsc ? IconSortAscending : IconSortDescending;
    return (
      <>
        {headerText && <WhyLabsText size={12}>{headerText}</WhyLabsText>}
        <WhyLabsText size={12} className={classes.tooltipWrapper}>
          Cards are in {directionLabel} order based on this field. Apply sorting from the <DirectionIcon size={18} />{' '}
          menu.
        </WhyLabsText>
      </>
    );
  };
  const { getNavUrl } = useNavLinkHandler();

  const modelUrl = getNavUrl({ page: 'summary', modelId: model.id });
  const resourceIsLlm = model.modelType === ModelType.Llm;
  const isModelOrDataTransform = isItModelOrDataTransform({
    category: model.assetCategory,
    type: model.modelType,
  });

  const isSecuredLLM = !!model.tracesSummary?.hasTraces;

  const profilesDateRange = (() => {
    const { oldestProfileTimestamp, latestProfileTimestamp } = model?.dataLineage ?? {};
    const { setEndOfProfile } = getFunctionsForTimePeriod.get(model.batchFrequency) ?? {};
    if (isNumber(oldestProfileTimestamp) && isNumber(latestProfileTimestamp)) {
      const endOfBucket = setEndOfProfile ? setEndOfProfile(latestProfileTimestamp).getTime() : latestProfileTimestamp;
      return [oldestProfileTimestamp, endOfBucket] as [number, number];
    }
    return null;
  })();

  return (
    <div className={classes.card} key={model.id} data-testid="ModelOverviewCard">
      {isSecuredLLM && (
        <>
          <div className={classes.securedTopIndicator} />
          <div>
            <WhyLabsTooltip label="Protected by WhyLabs Secure" wrapChildren={false}>
              <div className={classes.securedIconContainer}>
                <WhyLabsText className={classes.securedText}>SECURED</WhyLabsText>
                <IconShieldCheck size={15} color={Colors.blue2} />
              </div>
            </WhyLabsTooltip>
          </div>
        </>
      )}
      <div className={classes.cardContent}>
        <WhyLabsText className={classes.cardSubTitle}>
          {getResourceName.get(model.assetCategory ?? AssetCategory.Model)}
        </WhyLabsText>
        <CardResourceName
          model={model}
          modelUrl={modelUrl}
          fieldSortKey="Name"
          appliedSortKey={sortBy}
          sortTooltip={mountFieldSortTooltip(model.name)}
          searchTerm={searchTerm}
        />
        <WhyLabsText className={classes.cardSubTitle}>
          ID:{' '}
          <WhyLabsTextHighlight highlight={searchTerm ?? ''} darkText>
            {model.id}
          </WhyLabsTextHighlight>
        </WhyLabsText>

        <div className={classes.cardSpacer} />
        <CardResourceFreshness
          model={model}
          appliedSortKey={sortBy}
          fieldSortKey="Freshness"
          sortTooltip={mountFieldSortTooltip()}
        />

        <div className={classes.cardSpacer} />
        <CardResourceType
          model={model}
          fieldSortKey="ResourceType"
          sortTooltip={mountFieldSortTooltip()}
          appliedSortKey={sortBy}
        />
        <div className={classes.cardSpacer} />

        <CardResourceAnomaliesInRange
          timeseries={model.anomalyCounts?.timeseries ?? []}
          fieldSortKey="AnomaliesInRange"
          sortTooltip={mountFieldSortTooltip()}
          appliedSortKey={sortBy}
          model={model}
        />

        <div className={classes.cardSpacer} />
        <CardResourceLatestProfileWithAnomaly
          fieldSortKey="LatestAlert"
          sortTooltip={mountFieldSortTooltip()}
          appliedSortKey={sortBy}
          model={model}
        />
        <div className={classes.cardSpacer} />

        <WhyLabsText className={classes.cardSubTitle}>Tags</WhyLabsText>
        <CardResourceTags
          tags={model.resourceTags}
          resourceId={model.id}
          addResourceTagToFilter={addResourceTagToFilter}
        />
        <div className={classes.cardSpacer} />

        <WhyLabsText className={classes.cardSubTitle}>Batch frequency</WhyLabsText>
        <WhyLabsText className={classes.cardText}>{convertAbbreviationToBatchType(model.batchFrequency)}</WhyLabsText>
        <div className={classes.cardSpacer} />
        {resourceIsLlm ? renderLLMShortcuts() : renderShortcuts()}
        <div className={classes.cardSpacer} />
        <WhyLabsText className={classes.cardSubTitle}>Reference profiles</WhyLabsText>
        <WhyLabsText className={classes.cardText}>{model.referenceProfiles?.length || 0}</WhyLabsText>
        <ProfilesRangeCard
          range={profilesDateRange}
          modelId={model.id}
          batchFrequency={model.batchFrequency}
          assetCategory={model.assetCategory ?? null}
        />
        <div className={classes.cardSpacerSmall} />
      </div>
      <div className={classes.cardFooter}>
        <hr className={classes.cardFooterDivider} />
        <Link className={classes.cardFooterLink} to={getNavUrl({ page: 'summary', modelId: model.id })}>
          <WhyLabsText className={classes.cardFooterTxt}>
            <span>View summary dashboard</span>
            <span className={classes.cardFooterIcon}>
              <ArrowForwardIcon />
            </span>
          </WhyLabsText>
        </Link>
      </div>
    </div>
  );

  function renderLLMShortcuts() {
    return (
      <>
        <WhyLabsText className={classes.cardSubTitle}>Shortcuts</WhyLabsText>
        <WhyLabsText className={classes.cardText}>
          <Link to={getNavUrl({ page: 'columns', modelId: model.id })} className={classes.linkStyle}>
            Telemetry
          </Link>
          {' | '}
          <Link className={classes.linkStyle} to={getNavUrl({ page: 'profiles', modelId: model.id })}>
            Insights
          </Link>
          {isSecuredLLM && (
            <>
              {' | '}
              <InvisibleButton
                className={classes.linkStyle}
                onClick={() => {
                  window.location.href = mountLlmTracesUrl(model.id);
                }}
              >
                LLM Secure
              </InvisibleButton>
            </>
          )}
        </WhyLabsText>
      </>
    );
  }
  function renderShortcuts() {
    return (
      <>
        <WhyLabsText className={classes.cardSubTitle}>Shortcuts</WhyLabsText>
        <WhyLabsText className={classes.cardText}>
          <Link to={getNavUrl({ page: 'columns', modelId: model.id })} className={classes.linkStyle}>
            {model.entitySchema?.inputCounts.total} {isModelOrDataTransform ? 'inputs' : 'columns'}
          </Link>
          {renderOutputLink()}
          {' | '}
          <Link className={classes.linkStyle} to={getNavUrl({ page: 'segments', modelId: model.id })}>
            {model.totalSegments} segments
          </Link>
        </WhyLabsText>
      </>
    );
  }

  function renderOutputLink() {
    if (isModelOrDataTransform) {
      return (
        <>
          {' | '}
          <Link to={getNavUrl({ page: 'output', modelId: model.id })} className={classes.linkStyle}>
            {model.entitySchema?.outputCounts.total} outputs
          </Link>
        </>
      );
    }
    return null;
  }
};
export default ModelOverviewCard;
