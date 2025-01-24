import { Cell, CellProps } from 'fixed-data-table-2';
import { useCommonStyles } from 'hooks/useCommonStyles';
import useTypographyStyles from 'styles/Typography';
import { WhyLabsText } from 'components/design-system';

export interface SimpleTextCellProps extends CellProps {
  data: string[];
  isNumber?: boolean;
}

const SimpleTextCell: React.FC<SimpleTextCellProps> = ({ data, rowIndex, width, height, isNumber = false }) => {
  const { classes: commonStyles, cx } = useCommonStyles();
  const { classes: typography } = useTypographyStyles();
  if (rowIndex === undefined) {
    return <Cell />;
  }
  return (
    <Cell width={width} height={height}>
      <WhyLabsText
        inherit
        className={cx(
          typography.textTable,
          commonStyles.capitalize,
          commonStyles.cellNestedPadding,
          commonStyles.cellFont,
          isNumber ? commonStyles.numberAligned : '',
          typography.monoFont,
        )}
      >
        {data[rowIndex]}
      </WhyLabsText>
    </Cell>
  );
};

export default SimpleTextCell;
