import { SelectItem, createStyles } from '@mantine/core';
import { Colors } from '~/assets/Colors';
import { WhyLabsDropDown, WhyLabsSelect, WhyLabsText, WhyLabsTextInput } from '~/components/design-system';
import { ClickableDiv } from '~/components/misc/ClickableDiv';
import { TagManagement } from '~/components/tag/TagManagement';
import { UserDefinedTags, UserTag } from '~/components/tags/UserDefinedTags';
import { getLabelForModelType } from '~/utils/resourceTypeUtils';
import { ModelType, TimePeriod } from '~server/graphql/generated/graphql';
import { convertAbbreviationToBatchType } from '~server/util/time-period-utils';
import { FormEvent, useState } from 'react';

export const useStyles = createStyles({
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  label: {
    color: Colors.secondaryLight900,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.42,
    margin: 0,
  },
  tagSelectionContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  tagPlaceholderText: {
    color: Colors.brandSecondary600,
    fontSize: 14,
    cursor: 'pointer',
  },
});

type ResourceFormProps = {
  formId: string;
  isLoadingTags: boolean;
  isTimePeriodDisabled: boolean;
  onChangeName: (value: string) => void;
  onChangeTimePeriod: (value: TimePeriod) => void;
  onChangeTags: (tags: UserTag[]) => void;
  onChangeType: (value: ModelType) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  orgTags: UserTag[];
  resourceName: string;
  resourceType: ModelType | null;
  tags: UserTag[];
  timePeriod: TimePeriod | null;
};

export const ResourceForm = ({
  formId,
  isLoadingTags,
  isTimePeriodDisabled,
  onChangeName,
  onChangeTimePeriod,
  onChangeTags,
  onChangeType,
  onSubmit,
  orgTags,
  resourceName,
  resourceType,
  tags,
  timePeriod,
}: ResourceFormProps) => {
  const { classes } = useStyles();

  const [isOpenTagsDropdown, setIsOpenTagsDropdown] = useState(false);

  const closeTagsDropdown = () => {
    setIsOpenTagsDropdown(false);
  };

  const toggleTagsDropdown = () => {
    setIsOpenTagsDropdown((prev) => !prev);
  };

  const onRemoveTag = ({ customTag }: UserTag) => {
    onChangeTags(tags.filter((t) => t.customTag.key !== customTag.key || t.customTag.value !== customTag.value));
  };

  const removeTag = (tag: UserTag) => () => {
    onRemoveTag(tag);
  };

  const setTag = ({ customTag }: UserTag) => {
    onChangeTags([...tags, { customTag }]);
  };

  const typeOptions: SelectItem[] = (() => {
    const values = Object.values(ModelType);

    return Object.values(ModelType).map((_, index) => {
      const label = getLabelForModelType(values[index] as ModelType) ?? 'Not defined';
      return {
        group: getGroupLabelForModelType(values[index]),
        label,
        value: values[index],
      };
    });
  })();

  const timePeriodOptions: SelectItem[] = (() => {
    const availableTimePeriod: TimePeriod[] = [TimePeriod.Pt1H, TimePeriod.P1D, TimePeriod.P1W, TimePeriod.P1M];
    return availableTimePeriod.map((key) => ({
      label: convertAbbreviationToBatchType(key),
      value: key,
    }));
  })();

  return (
    <form className={classes.form} id={formId} onSubmit={onSubmit}>
      <WhyLabsTextInput
        label="Model or dataset name"
        onChange={onChangeName}
        placeholder="Enter a name"
        required
        value={resourceName}
      />
      <WhyLabsSelect data={typeOptions} label="Resource type" onChange={onChangeType} value={resourceType} />
      <WhyLabsSelect
        data={timePeriodOptions}
        disabled={isTimePeriodDisabled}
        disabledTooltip="Not available in the Starter plan. Please contact us to enable other batch frequencies."
        label="Batch frequency"
        onChange={onChangeTimePeriod}
        value={timePeriod}
      />
      {renderTagsDropdown()}
    </form>
  );

  function renderTagsDropdown() {
    const addTagsPlaceholder = `Click to add ${tags.length ? 'more' : ''} tags...`;

    return (
      <WhyLabsDropDown
        target={
          <ClickableDiv onClick={toggleTagsDropdown}>
            <label className={classes.label}>Tags</label>
            <div className={classes.tagSelectionContainer}>
              <UserDefinedTags
                tags={tags.map((tag) => ({
                  ...tag,
                  onDelete: removeTag(tag),
                }))}
                flexWrap
              />
              {!isOpenTagsDropdown && (
                <WhyLabsText className={classes.tagPlaceholderText}>{addTagsPlaceholder}</WhyLabsText>
              )}
            </div>
          </ClickableDiv>
        }
        closeModal={closeTagsDropdown}
        opened={isOpenTagsDropdown}
        position="bottom-start"
        width="90%"
        withinPortal={false}
      >
        <TagManagement
          appliedTags={tags}
          availableTags={orgTags}
          hideAppliedTags
          isLoadingAppliedTags={isLoadingTags}
          isLoadingAvailableTags={isLoadingTags}
          onRemoveTag={onRemoveTag}
          onSetTag={setTag}
        />
      </WhyLabsDropDown>
    );
  }
};

function getGroupLabelForModelType(key: string): string {
  const modelTypes: string[] = [
    ModelType.Classification,
    ModelType.Regression,
    ModelType.Embeddings,
    ModelType.Llm,
    ModelType.Ranking,
    ModelType.ModelOther,
  ];
  const datasetTypes: string[] = [
    ModelType.DataSource,
    ModelType.DataStream,
    ModelType.DataTransform,
    ModelType.DataOther,
  ];

  if (modelTypes.includes(key)) return 'Model types';
  if (datasetTypes.includes(key)) return 'Dataset types';
  return '';
}
