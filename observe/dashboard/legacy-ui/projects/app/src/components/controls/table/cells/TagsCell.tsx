import { Cell, CellProps } from 'fixed-data-table-2';
import { TagList } from 'components/design-system/tags/TagList';
import { useCommonStyles } from 'hooks/useCommonStyles';
import useTypographyStyles from 'styles/Typography';
import { WhyLabsText } from 'components/design-system';
import { CustomTag } from 'generated/graphql';

interface TagsCellProps extends CellProps {
  tags: CustomTag[];
  resourceId: string;
  addResourceTagToFilter?: (t: string[]) => void;
}

const DEFAULT_ROW_WIDTH = 400;

function TagsCell({
  tags,
  resourceId,
  width = DEFAULT_ROW_WIDTH,
  height,
  addResourceTagToFilter,
}: TagsCellProps): JSX.Element {
  const { classes: commonStyles, cx } = useCommonStyles();
  const { classes: typography } = useTypographyStyles();

  const renderTagRow = () => {
    return (
      <TagList
        addResourceTagToFilter={addResourceTagToFilter}
        tags={tags}
        resourceId={resourceId}
        maxWidth={width}
        noTagsElement={
          <WhyLabsText
            inherit
            className={cx(
              typography.textTable,
              commonStyles.capitalize,
              commonStyles.cellNestedPadding,
              commonStyles.cellFont,
              typography.monoFont,
            )}
          >
            No tags
          </WhyLabsText>
        }
      />
    );
  };

  return <Cell height={height}>{renderTagRow()}</Cell>;
}

export default TagsCell;
