import { Link } from 'react-router-dom';
import { Cell, CellProps } from 'fixed-data-table-2';
import { useCommonStyles } from 'hooks/useCommonStyles';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import useTypographyStyles from 'styles/Typography';
import { WhyLabsText } from 'components/design-system';

export interface SegmentCellProps extends CellProps {
  readonly modelId: string;
  readonly height: number;
  readonly width: number;
  readonly data: string[];
}

const SegmentCell: React.FC<SegmentCellProps> = ({ width, height, modelId, rowIndex, data }) => {
  const { classes: commonStyles, cx } = useCommonStyles();
  const { classes: typography } = useTypographyStyles();
  const { getNavUrl } = useNavLinkHandler();

  if (rowIndex === undefined || !data[rowIndex]) {
    return <Cell />;
  }

  return (
    <Cell className={commonStyles.cellNestedPadding} width={width} height={height}>
      <Link
        className={cx(typography.link, commonStyles.linkCell, commonStyles.cellFont)}
        to={getNavUrl({ page: 'segments', modelId })}
      >
        <WhyLabsText inherit className={typography.monoFont}>
          {data[rowIndex]}
        </WhyLabsText>
      </Link>
    </Cell>
  );
};

export default SegmentCell;
