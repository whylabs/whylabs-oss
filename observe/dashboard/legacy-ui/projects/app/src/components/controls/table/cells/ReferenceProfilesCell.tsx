import { WhyLabsText } from 'components/design-system';
import { Cell, CellProps } from 'fixed-data-table-2';
import { useCommonStyles } from 'hooks/useCommonStyles';
import useTypographyStyles from 'styles/Typography';

export interface ReferenceProfilesCellProps extends CellProps {
  readonly referenceProfileCount: number;
}

const ReferenceProfilesCell: React.FC<ReferenceProfilesCellProps> = ({
  referenceProfileCount,
  width,
  height,
  rowIndex,
}) => {
  const { classes: commonStyles } = useCommonStyles();
  const { classes: typography } = useTypographyStyles();

  if (rowIndex === undefined) {
    return <Cell />;
  }

  return (
    <Cell className={commonStyles.cellNestedPadding} width={width} height={height}>
      <WhyLabsText inherit className={typography.monoFont}>
        {referenceProfileCount}
      </WhyLabsText>
    </Cell>
  );
};

export default ReferenceProfilesCell;
