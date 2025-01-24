import { Link } from 'react-router-dom';
import { Cell, CellProps } from 'fixed-data-table-2';
import { useCommonStyles } from 'hooks/useCommonStyles';
import useTypographyStyles from 'styles/Typography';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { AssetCategory, Maybe, ModelType } from 'generated/graphql';
import { isItModelOrDataTransform } from 'utils/modelTypeUtils';
import { WhyLabsText } from 'components/design-system';

export interface OutputCellProps extends CellProps {
  readonly data: string[];
  readonly height: number;
  readonly resourceId: string;
  readonly resourceCategory: Maybe<AssetCategory> | undefined;
  readonly resourceType: ModelType;
  readonly width: number;
}

const OutputCell: React.FC<OutputCellProps> = ({
  data,
  height,
  resourceId,
  resourceCategory,
  resourceType,
  rowIndex,
  width,
}) => {
  const { classes: commonStyles, cx } = useCommonStyles();
  const { classes: typography } = useTypographyStyles();
  const { getNavUrl } = useNavLinkHandler();

  if (rowIndex === undefined || !data[rowIndex]) {
    return <Cell />;
  }

  const isModelOrDataTransform = isItModelOrDataTransform({
    category: resourceCategory,
    type: resourceType,
  });

  const renderCellChildren = () => {
    if (!isModelOrDataTransform) return '-';

    return (
      <Link
        className={cx(typography.link, commonStyles.linkCell, commonStyles.cellFont)}
        to={getNavUrl({ page: 'output', modelId: resourceId })}
      >
        <WhyLabsText inherit className={typography.monoFont}>
          {data[rowIndex]}
        </WhyLabsText>
      </Link>
    );
  };

  return (
    <Cell width={width} height={height}>
      {renderCellChildren()}
    </Cell>
  );
};

export default OutputCell;
