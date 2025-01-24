import AddIcon from '@material-ui/icons/Add';
import { ApolloError } from '@apollo/client';
import { Skeleton } from '@material-ui/lab';
import { WhyLabsText } from 'components/design-system';
import { Link } from 'react-router-dom';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { ModelSortBy, SortDirectionType } from 'hooks/useSort/types';
import { useCardLayoutStyles } from './useResourceOverviewCardLayoutCSS';
import ModelOverviewCard from './ModelOverviewCard/ModelOverviewCard';
import { ResourceOverviewData } from '../../layoutHelpers';

interface ResourceOverviewCardLayoutProps {
  readonly searchTerm?: string;
  loading: boolean;
  error?: ApolloError;
  userCanManageDatasets: boolean;
  sortBy?: ModelSortBy;
  sortByDirection?: SortDirectionType;
  filteredData: ResourceOverviewData[];
  withTags?: boolean;
  addResourceTagToFilter: (t: string[]) => void;
}

function ResourceOverviewCardLayout({
  searchTerm,
  loading,
  error,
  sortBy,
  sortByDirection,
  userCanManageDatasets,
  filteredData,
  withTags = false,
  addResourceTagToFilter,
}: ResourceOverviewCardLayoutProps): JSX.Element {
  const { getNavUrl } = useNavLinkHandler();
  const { classes } = useCardLayoutStyles();

  if (error) {
    console.error(error);
  }
  if (loading) {
    return (
      <div className={classes.root}>
        <div className={classes.cardsWrap}>
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={`model-overview-key-${i}`} variant="rect" animation="wave" width={250} height={500} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className={classes.root} data-testid="card-dashboard-layout">
      <div className={classes.cardsWrap}>
        {filteredData?.map((model) => {
          const idKey = `model-card-key-${model.id}`;
          return (
            <ModelOverviewCard
              sortByDirection={sortByDirection}
              sortBy={sortBy}
              key={idKey}
              model={model}
              searchTerm={searchTerm}
              addResourceTagToFilter={addResourceTagToFilter}
            />
          );
        })}
        {userCanManageDatasets && (
          <Link
            className={classes.addCardBtn}
            to={getNavUrl({ page: 'settings', settings: { path: 'model-management' } })}
          >
            <WhyLabsText className={classes.addCardBtnLink}>
              <span>Create resource</span>
              <span className={classes.addCardBtnIcon}>
                <AddIcon color="primary" fontSize="small" />
              </span>
            </WhyLabsText>
          </Link>
        )}
      </div>
    </div>
  );
}

export default ResourceOverviewCardLayout;
