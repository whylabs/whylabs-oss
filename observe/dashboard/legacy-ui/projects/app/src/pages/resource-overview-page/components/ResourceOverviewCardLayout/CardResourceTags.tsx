import { WhyLabsText } from 'components/design-system';
import { CustomTag } from 'generated/graphql';
import { TagList } from 'components/design-system/tags/TagList';
import { useCardLayoutStyles } from './useResourceOverviewCardLayoutCSS';

type CardResourceTagsProps = {
  tags?: CustomTag[];
  resourceId: string;
  addResourceTagToFilter: (t: string[]) => void;
};

export function CardResourceTags({ tags, resourceId, addResourceTagToFilter }: CardResourceTagsProps): JSX.Element {
  const { classes, cx } = useCardLayoutStyles();

  const renderTags = () => {
    return (
      <TagList
        tags={tags}
        addResourceTagToFilter={addResourceTagToFilter}
        resourceId={resourceId}
        maxWidth={300}
        noTagsElement={<WhyLabsText className={cx(classes.cardText, classes.cardNoData)}>No resource tags</WhyLabsText>}
      />
    );
  };

  return renderTags();
}
