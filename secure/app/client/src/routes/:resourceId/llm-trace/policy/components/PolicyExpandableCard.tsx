import { createStyles } from '@mantine/core';
import { ReactElement } from 'react';
import { Colors } from '~/assets/Colors';
import { WhyLabsAccordion, WhyLabsCheckboxGroup, WhyLabsSwitch, WhyLabsText } from '~/components/design-system';
import { generateIcon } from '~/components/factories/IconFactory';
import { generateSegmentedLabel } from '~/components/factories/SegmentedLabelFactory';
import { SegmentedRowComponent } from '~/routes/:resourceId/llm-trace/policy/components/SegmentedRowComponent';
import { isNumber } from '~/utils/typeGuards';
import {
  CheckboxGroup,
  CheckboxGroupSelectionValue,
  PolicyConfigSelection,
  PolicyRuleSet,
  SegmentedControl,
  SegmentedControlSelectionValue,
} from '~server/schemas/generated/llm-policies-schema';

export type PolicyExpandableCardProps = {
  onChange: (policySelection: PolicyConfigSelection) => void;
  currentConfigSelection?: PolicyConfigSelection;
} & PolicyRuleSet;

const useStyles = createStyles(() => ({
  policyCardRoot: {
    background: 'white',
    width: '100%',
    border: `2px solid ${Colors.brandSecondary200}`,
    borderRadius: 4,
    position: 'relative',
  },
  cardHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 5,
    alignSelf: 'stretch',
  },
  headerTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingBottom: 5,
  },
  flexCenterAligned: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: Colors.secondaryLight1000,
    fontFamily: 'Asap',
    fontSize: 16,
    margin: 0,
    fontWeight: 600,
  },
  headerDescriptionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  descriptionText: {
    color: Colors.secondaryLight1000,
    fontFamily: 'Asap',
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.42,
    letterSpacing: '-0.14px',
  },
  latencyText: {
    color: Colors.secondaryLight1000,
    fontFamily: 'Asap',
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1.66,
    letterSpacing: '-0.12px',
  },
  optionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    paddingTop: 16,
  },
  contentTitle: {
    color: Colors.secondaryLight1000,
    fontFamily: 'Asap',
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: '-0.14px',
    margin: 0,
  },
  checkboxGroupRoot: {
    marginTop: -5,
    marginBottom: 12,
    '& > div': {
      gap: 10,
    },
  },
  switchWrapper: {
    position: 'absolute',
    right: 50,
  },
  flexContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 15,
  },
}));

type CardHeaderProps = Pick<PolicyRuleSet, 'title' | 'icon' | 'description' | 'latencyMilliseconds'>;

const CardHeader = ({ title, icon, description, latencyMilliseconds }: CardHeaderProps) => {
  const { classes } = useStyles();

  return (
    <div className={classes.cardHeader}>
      <div className={classes.headerTitleRow}>
        <div className={classes.flexCenterAligned}>
          {generateIcon({ name: icon, size: 18, color: Colors.secondaryLight1000 })}
          <WhyLabsText className={classes.headerTitle}>{title}</WhyLabsText>
        </div>
      </div>
      <div className={classes.headerDescriptionRow}>
        <WhyLabsText className={classes.descriptionText}>{description}</WhyLabsText>
        <WhyLabsText className={classes.latencyText}>
          {isNumber(latencyMilliseconds) ? `Adds up to ${latencyMilliseconds}ms` : 'Est. latency coming soon'}
        </WhyLabsText>
      </div>
    </div>
  );
};

export const PolicyExpandableCard = ({
  id,
  config,
  onChange,
  currentConfigSelection,
  ...rest
}: PolicyExpandableCardProps): ReactElement => {
  const { classes } = useStyles();

  const renderExtraOptions = (control: CheckboxGroup) => {
    if (!control.options.length) return null;

    const controlValue = usedConfigParams.find(
      (c): c is CheckboxGroupSelectionValue => c.id === control.id && c.type === 'checkbox-group',
    )?.value;

    return (
      <div className={classes.optionsContainer} key={control.id}>
        <WhyLabsText className={classes.contentTitle}>{control.title}</WhyLabsText>
        <WhyLabsCheckboxGroup
          classNames={{
            root: classes.checkboxGroupRoot,
          }}
          label={undefined}
          options={control.options}
          orientation="column"
          onChange={(selectedValues) => handleParamChange(control, selectedValues)}
          value={controlValue}
        />

        {control.description && <WhyLabsText className={classes.descriptionText}>{control.description}</WhyLabsText>}
      </div>
    );
  };

  const isEnabledPolicy = !!currentConfigSelection?.enabled;
  const usedConfigParams: PolicyConfigSelection['params'] = (() => {
    return config.map((c) => {
      const foundSelection = currentConfigSelection?.params?.find(
        (selection) => selection.id === c.id && selection.type === c.type,
      );
      const isSegmentedControl = c.type === 'segmented-control';
      const fallback = isSegmentedControl ? c.options[0]?.value : [];
      return {
        id: c.id,
        type: c.type,
        value: foundSelection?.value || fallback,
      } as unknown as SegmentedControlSelectionValue | CheckboxGroupSelectionValue;
    });
  })();

  const onToggleSwitch = () => {
    onChange({
      ...(currentConfigSelection ?? { params: usedConfigParams }),
      id,
      enabled: !isEnabledPolicy,
    });
  };

  const handleParamChange = (control: SegmentedControl | CheckboxGroup, newValue: string[]) => {
    const newParams = [...usedConfigParams];
    const currentControlIndex = newParams.findIndex((c) => c.id === control.id);
    const newConfig = (() => {
      if (control.type === 'segmented-control') {
        return { id: control.id, type: control.type, value: newValue[0] };
      }
      return { id: control.id, type: control.type, value: newValue };
    })();
    if (currentControlIndex !== -1) {
      newParams[currentControlIndex] = newConfig;
    } else {
      newParams.push(newConfig);
    }
    onChange({
      id,
      enabled: isEnabledPolicy,
      params: newParams,
    });
  };

  const renderSegmentedControl = (control: SegmentedControl) => {
    if (!control.options.length) return null;
    const mappedItems = control.options.map(({ label, value, color, icon }) => ({
      color: color ?? Colors.brandSecondary700,
      label: generateSegmentedLabel({
        label,
        iconName: icon,
      }),
      value,
    }));

    const controlValue = usedConfigParams.find(
      (c): c is SegmentedControlSelectionValue => c.id === control.id && c.type === 'segmented-control',
    )?.value;

    const description = (() => {
      const tempDescription = control.description.replace('{s}', controlValue ?? '');
      const firstLetterUpperCase = tempDescription[0].toUpperCase();
      const restOfString = tempDescription.substring(1);
      return `${firstLetterUpperCase}${restOfString}`;
    })();

    return (
      <SegmentedRowComponent
        key={control.id}
        description={description}
        segmentItems={mappedItems}
        onChange={(newValue) => handleParamChange(control, [newValue])}
        title={control.title}
        value={controlValue}
      />
    );
  };

  return (
    <WhyLabsAccordion.Item value={id} className={classes.policyCardRoot}>
      <div className={classes.switchWrapper}>
        <WhyLabsSwitch onChange={onToggleSwitch} checked={isEnabledPolicy} label="Toggle policy" hideLabel />
      </div>
      <WhyLabsAccordion.Title
        chevron={generateIcon({ name: 'chevron-down', width: 30, color: Colors.secondaryLight1000 })}
      >
        <CardHeader {...rest} />
      </WhyLabsAccordion.Title>
      <WhyLabsAccordion.Content>
        <div className={classes.flexContent}>
          {config.map((c) => {
            if (c.type === 'segmented-control') {
              return renderSegmentedControl(c);
            }
            return renderExtraOptions(c);
          })}
        </div>
      </WhyLabsAccordion.Content>
    </WhyLabsAccordion.Item>
  );
};
