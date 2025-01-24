import { IconCopy, IconTrash } from '@tabler/icons-react';
import { Colors, chartColorForIndex } from '~/assets/Colors';
import {
  SelectCustomItems,
  WhyLabsActionIcon,
  WhyLabsSelect,
  WhyLabsText,
  WhyLabsTextInput,
} from '~/components/design-system';
import { useFlags } from '~/hooks/useFlags';
import { useSegmentFilter } from '~/hooks/useSegmentFilter';
import { segmentStringToTags } from '~/utils/segments';
import { ReactNode } from 'react';

import { UseChartPlotBuilderViewModelProps, useChartPlotBuilderViewModel } from './useChartPlotBuilderViewModel';
import { useGraphBuilderStyles } from './utils';

type ChartPlotBuilderProps = UseChartPlotBuilderViewModelProps & {
  index: number;
  onClone: () => void;
  onDelete: () => void;
};

export const ChartPlotBuilder = ({ index, onClone, onDelete, ...rest }: ChartPlotBuilderProps) => {
  const { column, displayName, isResourceEmpty, isItReady, metric, resource, segment } =
    useChartPlotBuilderViewModel(rest);
  const { classes, cx } = useGraphBuilderStyles();
  const flags = useFlags();

  const color = chartColorForIndex(index);

  const { renderFilter } = useSegmentFilter({
    allowWildcardSegment: flags.customDashboardsWildcardSegment,
    onChange: segment.onChange,
    resourceId: resource.selected?.value ?? '',
    selectedSegment: segmentStringToTags(segment.value),
  });

  const shouldHideLabel = index > 0;

  const commonSelectProps = {
    hideLabel: shouldHideLabel,
    maxDropdownHeight: 300,
    dropdownWidth: 360,
  };

  const commonActionIconProps = {
    color: Colors.secondaryLight1000,
    size: 20,
  };

  return (
    <div className={classes.root}>
      <div className={classes.resourceSelectFlex}>
        <div className={classes.colorDisplay} style={{ background: color }} />
        <div className={classes.resourceSelectWrapper}>
          <WhyLabsSelect
            {...commonSelectProps}
            data={resource.data}
            itemComponent={SelectCustomItems.GenericFlexColumnItem}
            label="Resource:"
            onChange={resource.onChange}
            loading={resource.isLoading}
            placeholder="Select"
            value={resource.selected?.value ?? null}
          />
        </div>
      </div>
      <div className={classes.metricSelectWrapper}>
        <WhyLabsSelect
          {...commonSelectProps}
          data={metric.data}
          disabled={metric.disabled}
          itemComponent={SelectCustomItems.GenericFlexColumnItem}
          label="Metric:"
          loading={metric.isLoading}
          onChange={metric.onChange}
          placeholder={isResourceEmpty ? 'Select resource' : 'Select'}
          value={metric.selected?.value ?? null}
        />
      </div>
      <div className={classes.columnSelectWrapper}>
        {column.disabled ? (
          renderNotApplicableText('Column:')
        ) : (
          <WhyLabsSelect
            {...commonSelectProps}
            data={column.data}
            disabled={isResourceEmpty}
            label="Column:"
            loading={column.isLoading}
            onChange={column.onChange}
            placeholder={isResourceEmpty ? 'Select resource' : 'Select'}
            value={column.selected?.value ?? null}
          />
        )}
      </div>
      <div className={classes.segmentSelectWrapper}>
        {segment.disabled
          ? renderNotApplicableText(
              <WhyLabsText size={14}>
                Segment <span className={classes.optionalSpan}>optional</span>:
              </WhyLabsText>,
            )
          : renderFilter({
              disabled: isResourceEmpty,
              hideIcon: true,
              hideLabel: shouldHideLabel,
              maxDropdownHeight: 300,
              label: (
                <WhyLabsText size={14}>
                  Segment <span className={classes.optionalSpan}>optional</span>:
                </WhyLabsText>
              ),
              placeholder: isResourceEmpty ? 'Select resource' : 'Select',
            })}
      </div>
      <div className={classes.displayNameWrapper}>
        <WhyLabsTextInput
          hideLabel={shouldHideLabel}
          label={
            <WhyLabsText size={14}>
              Display name <span className={classes.optionalSpan}>optional</span>:
            </WhyLabsText>
          }
          onChange={displayName.onChange}
          placeholder="Name"
          value={displayName.value}
        />
      </div>
      <div className={cx(classes.plotActions, !shouldHideLabel ? classes.labelSpace : '')}>
        <WhyLabsActionIcon
          className={cx(classes.actionIcon, {
            [classes.hidden]: !isItReady,
          })}
          label="Clone"
          onClick={onClone}
        >
          <IconCopy {...commonActionIconProps} />
        </WhyLabsActionIcon>
        <WhyLabsActionIcon
          className={cx(classes.actionIcon, {
            [classes.hidden]: !isItReady && index === 0,
          })}
          label="Delete"
          onClick={onDelete}
        >
          <IconTrash {...commonActionIconProps} />
        </WhyLabsActionIcon>
      </div>
    </div>
  );

  function renderNotApplicableText(label: ReactNode) {
    return (
      <div className={classes.notApplicableFlex}>
        {!shouldHideLabel && <WhyLabsText className={classes.notApplicableLabel}>{label}</WhyLabsText>}
        <WhyLabsText className={classes.notApplicableText} color={Colors.secondaryLight1000}>
          Not applicable
        </WhyLabsText>
      </div>
    );
  }
};
