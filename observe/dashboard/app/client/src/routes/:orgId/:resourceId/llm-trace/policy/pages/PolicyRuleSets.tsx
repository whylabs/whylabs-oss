import { createStyles } from '@mantine/core';
import { SkeletonGroup, WhyLabsAccordion } from '~/components/design-system';
import { PolicyExpandableCard } from '~/routes/:orgId/:resourceId/llm-trace/policy/components/PolicyExpandableCard';
import { useLlmTracePolicyContext } from '~/routes/:orgId/:resourceId/llm-trace/policy/useLlmTracePolicyViewModel';
import { CARD_WIDTH, accordionStyles } from '~/routes/:orgId/:resourceId/llm-trace/policy/utils';
import { ReactElement } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';

const useStyles = createStyles(() => ({
  policyGroupFlexContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 15,
  },
  cardWrapper: {
    display: 'flex',
    flexGrow: 1,
    width: '100%',
    maxWidth: CARD_WIDTH.max,
    minWidth: CARD_WIDTH.min,
  },
}));
export const PolicyRuleSets = (): ReactElement => {
  const { classes } = useStyles();
  const {
    setActiveMenuItem,
    schema,
    cardRefs,
    activeMenuItem,
    updatePolicyConfigSelection,
    setPolicySearchParam,
    hasLoadingQueries,
    editedAdvancedRulesets,
    isPolicySourceAPI,
  } = useLlmTracePolicyContext();
  const [searchParams] = useSearchParams();

  if (isPolicySourceAPI) {
    return <Navigate to={{ pathname: './change-history', search: searchParams.toString() }} replace />;
  }

  const onChangeAccordion = (value: string | null) => {
    setActiveMenuItem(value);
    setPolicySearchParam(value);
  };

  if (hasLoadingQueries)
    return (
      <div className={classes.policyGroupFlexContainer}>
        <SkeletonGroup count={1} height={248} width="900px" />
        <SkeletonGroup count={4} height={88} width="900px" />
      </div>
    );

  return (
    <div className={classes.policyGroupFlexContainer}>
      {schema?.policies?.map((policy) => {
        const currentConfigSelection = schema.configSelections.policies.find(({ id }) => id === policy.id);
        const isDisabled = editedAdvancedRulesets.includes(policy.id);
        return (
          <div
            key={`card--${policy.id}`}
            ref={(el) => cardRefs.current.set(policy.id, el)}
            className={classes.cardWrapper}
          >
            <WhyLabsAccordion.Root
              className={classes.cardWrapper}
              value={activeMenuItem}
              onChange={onChangeAccordion}
              styles={accordionStyles}
              disableChevronRotation={isDisabled}
            >
              <PolicyExpandableCard
                {...policy}
                onChange={updatePolicyConfigSelection}
                currentConfigSelection={currentConfigSelection}
                disabled={isDisabled}
              />
            </WhyLabsAccordion.Root>
          </div>
        );
      })}
    </div>
  );
};
