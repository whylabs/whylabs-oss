import { getLabelForModelType } from 'utils/modelTypeUtils';
import { WhyLabsText, WhyLabsTooltip } from 'components/design-system';
import { useCardLayoutStyles } from './useResourceOverviewCardLayoutCSS';
import { CardResourceSortableFieldProps } from '../../layoutHelpers';

const CardResourceType: React.FC<CardResourceSortableFieldProps> = ({
  model,
  fieldSortKey,
  appliedSortKey,
  sortTooltip,
}) => {
  const { classes } = useCardLayoutStyles();
  const activeSorting = fieldSortKey === appliedSortKey;
  return (
    <WhyLabsTooltip label={activeSorting ? sortTooltip : ''}>
      <WhyLabsText className={classes.cardSubTitle}>Resource type</WhyLabsText>
      <WhyLabsText className={classes.cardText}>{getLabelForModelType(model.modelType)}</WhyLabsText>
    </WhyLabsTooltip>
  );
};
export default CardResourceType;
