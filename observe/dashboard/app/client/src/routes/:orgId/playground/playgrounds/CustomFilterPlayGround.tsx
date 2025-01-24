import { createStyles } from '@mantine/core';
import { useResourceFilter } from '~/components/resources-filter/useResourceFilter';
import { NONE_TAGS_GROUP } from '~/components/tags/UserDefinedTags';
import { CustomTag } from '~server/graphql/generated/graphql';

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    padding: 20,
    background: 'white',
  },
  filtersBadge: {
    borderRadius: '0.25rem',
    fontFamily: 'Inconsolata',
    height: 22,
    '& *': {
      fontFamily: 'Inconsolata',
    },
  },
}));

const mockedTags: CustomTag[] = [
  {
    key: 'application',
    value: 'market-risk-calculator',
    color: '#F211ED',
    backgroundColor: '#FDE7FD',
  },
  { key: 'criticality', value: 'P3', color: '#D92AD6', backgroundColor: '#FBE9FA' },
  { key: NONE_TAGS_GROUP, value: 'string-tag', color: '#BEC43F', backgroundColor: '#F8F9EB' },
];

export const CustomFilter = () => {
  const { classes } = useStyles();
  const { renderFilter, activeFilters } = useResourceFilter();

  return (
    <div className={classes.root}>
      <div> filters: {JSON.stringify(activeFilters, null, 2)}</div>
      {renderFilter({ resourceTags: mockedTags, loading: false })}
    </div>
  );
};
