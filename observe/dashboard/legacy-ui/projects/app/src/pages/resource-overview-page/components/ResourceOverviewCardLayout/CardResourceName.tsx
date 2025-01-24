import { Link } from 'react-router-dom';
import { WhyLabsText, WhyLabsTextHighlight, WhyLabsTooltip } from 'components/design-system';
import { useCardLayoutStyles } from './useResourceOverviewCardLayoutCSS';
import { CardResourceSortableFieldProps } from '../../layoutHelpers';

interface CardResourceNameProps extends CardResourceSortableFieldProps {
  modelUrl: string;
  readonly searchTerm?: string;
}

const CardResourceName: React.FC<CardResourceNameProps> = ({
  model,
  modelUrl,
  fieldSortKey,
  appliedSortKey,
  sortTooltip,
  searchTerm,
}) => {
  const { classes } = useCardLayoutStyles();
  const activeSorting = fieldSortKey === appliedSortKey;
  const usedTooltip = activeSorting ? sortTooltip : model.name;
  return (
    <div className={classes.editContainer}>
      <WhyLabsTooltip label={usedTooltip} position="top">
        <WhyLabsText className={classes.cardName}>
          <Link to={modelUrl}>
            <WhyLabsTextHighlight highlight={searchTerm ?? ''} darkText>
              {model.name}
            </WhyLabsTextHighlight>
          </Link>
        </WhyLabsText>
      </WhyLabsTooltip>
    </div>
  );
};
export default CardResourceName;
