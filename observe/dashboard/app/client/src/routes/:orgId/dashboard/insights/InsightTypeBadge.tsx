import { createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { WhyLabsText } from '~/components/design-system';
import { InsightType, insightsNameMapper } from '~/routes/:orgId/dashboard/insights/utils';
import React, { forwardRef } from 'react';

export const InsightTypeBadge = forwardRef(
  (props: { insightType: string }, ref: React.ForwardedRef<HTMLDivElement>) => {
    let content: React.ReactElement;
    const { insightType } = props;
    const insightLabel = insightsNameMapper.get(insightType) ?? insightType;
    switch (insightType) {
      case InsightType.HIGH_CARDINALITY:
        content = <Badge text={insightLabel} color={Colors.chartPrimary} />;
        break;
      case InsightType.IMBALANCED:
        content = <Badge text={insightLabel} color={Colors.chartPurple} />;
        break;
      case InsightType.NULL_VALUES:
        content = <Badge text={insightLabel} color={Colors.chartBlue} />;
        break;
      case InsightType.MIXED_DATA_TYPE:
        content = <Badge text={insightLabel} color={Colors.chartAqua} />;
        break;
      case InsightType.LLM_TOXICITY:
        content = <Badge llm text={insightLabel} color={Colors.green} />;
        break;
      case InsightType.LLM_PATTERNS:
        content = <Badge llm text={insightLabel} color={Colors.brown} />;
        break;
      case InsightType.LLM_NEGATIVE_SENTIMENT:
        content = <Badge llm text={insightLabel} color={Colors.red} />;
        break;
      case InsightType.LLM_POSITIVE_SENTIMENT:
        content = <Badge llm text={insightLabel} color={Colors.pink} />;
        break;
      case InsightType.LLM_RESUAL:
      case InsightType.LLM_REFUSAL:
        content = <Badge llm text={insightLabel} color={Colors.teal} />;
        break;
      case InsightType.LLM_READING_EASE:
        content = <Badge llm text={insightLabel} color={Colors.chartOrange} />;
        break;
      case InsightType.LLM_JAILBREAK_SIMILARITY:
        content = <Badge llm text={insightLabel} color={Colors.blue} />;
        break;
      default:
        content = <></>;
    }

    return (
      <div {...props} ref={ref}>
        {content}
      </div>
    );
  },
);

const useStyles = createStyles(() => ({
  root: {
    display: 'flex',
    width: '100%',
    backgroundColor: Colors.white,
    borderTop: `1px solid ${Colors.brandSecondary200}`,
    borderLeft: `1px solid ${Colors.brandSecondary200}`,
    flexDirection: 'column',
    paddingTop: 17,
    paddingBottom: 17,
    overflowY: 'scroll',
  },
  featureName: {
    color: Colors.brandPrimary900,
    cursor: 'pointer',
    padding: '5px',
    '&:hover': {
      background: Colors.brandPrimary900,
      color: Colors.white,
    },
  },
  featureNameButton: {
    paddingLeft: 0,
    '&:hover': {
      backgroundColor: 'rgba(0,0,0,0)',
    },
  },
  row: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    '&:hover': {
      backgroundColor: Colors.brandSecondary100,
    },
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 17,
    paddingRight: 17,
    '& p': {
      fontSize: 14,
      lineHeight: 1.1,
    },
  },
  columnFirst: {
    flexGrow: 1,
  },
  columnOther: {
    display: 'flex',
  },
  badgeRoot: {
    display: 'flex',
    flexDirection: 'row',
    marginLeft: 10,
  },
  badge: {
    borderRadius: 4,
    padding: '6px 8px',
    color: 'white',
    whiteSpace: 'nowrap',
    textTransform: 'uppercase',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  badgeLLM: {
    borderRadius: '0 4px 4px 0',
    padding: '6px 8px',
    color: 'white',
    whiteSpace: 'nowrap',
    textTransform: 'uppercase',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  codeFont: {
    marginRight: '5px',
    fontFamily: 'Asap',
    fontStyle: 'normal',
    fontWeight: 'normal',
    fontSize: '15px',
    lineHeight: '14px',
  },
}));

const useLLMStyles = createStyles(() => ({
  verticalTextSquare: {
    display: 'flex',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px 0px 0px 4px',
    borderTop: '1px solid',
    borderBottom: '1px solid',
    borderLeft: '1px solid',
    borderColor: Colors.brandSecondary500,
  },
  verticalText: {
    transform: 'rotate(-90deg)',
    whiteSpace: 'nowrap',
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    fontFamily: 'Asap',
    color: Colors.secondaryLight1000,
  },
}));

const VerticalTextSquare = () => {
  const { classes } = useLLMStyles();

  return (
    <div className={classes.verticalTextSquare}>
      <div className={classes.verticalText}>LLM</div>
    </div>
  );
};

interface BadgeProps {
  text: string;
  color: string;
  llm?: boolean;
}
const Badge = (props: BadgeProps) => {
  const { color, text, llm } = props;
  const { classes } = useStyles();
  return (
    <div className={classes.badgeRoot}>
      {llm && <VerticalTextSquare />}
      <WhyLabsText className={llm ? classes.badgeLLM : classes.badge} style={{ backgroundColor: color }}>
        {text}
      </WhyLabsText>
    </div>
  );
};
