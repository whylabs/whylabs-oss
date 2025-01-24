import { createStyles, FormControlLabel, IconButton, makeStyles } from '@material-ui/core';
import { useMemo, useState } from 'react';
import Brightness6Icon from '@material-ui/icons/Brightness6';
import WhyLabsCodeBlock from 'components/whylabs-code-block/WhyLabsCodeBlock';
import WhyLabsCodeEditor from 'components/whylabs-code-block/WhyLabsCodeEditor';
import {
  WhyLabsAlert,
  WhyLabsAutocomplete,
  WhyLabsButton,
  WhyLabsCheckboxGroup,
  WhyLabsContextMenu,
  WhyLabsMultiSelect,
  WhyLabsNumberInput,
  WhyLabsSearchInput,
  WhyLabsSelect,
  WhyLabsSubmitButton,
  WhyLabsSwitch,
  WhyLabsTabs,
  WhyLabsTextInput,
  WhyLabsTooltip,
  SelectCustomItems,
} from 'components/design-system';
import WhyRadio from 'components/controls/widgets/WhyRadio';
import { Colors } from '@whylabs/observatory-lib';
import { IconInfoCircle } from '@tabler/icons';
import { WhyLabsSuperDatePicker } from 'components/super-date-picker/WhyLabsSuperDatePicker';
import { TimePeriod, useGetIntegrationCardsQuery } from 'generated/graphql';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';
import { IntegrationCard } from 'components/cards/integration-card/IntegrationCard';
import { IntegrationCardType } from 'components/cards/integration-card/integrationCardTypes';
import { Tag } from 'components/design-system/tags/Tag';
import { MoreTag } from 'components/design-system/tags/MoreTag';
import { TagList } from 'components/design-system/tags/TagList';

const useStyles = makeStyles(() =>
  createStyles({
    container: {
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
      paddingBottom: '60px',
      gap: 50,
    },
    label: {
      fontSize: '26px',
      fontWeight: 600,
      display: 'block',
    },
    componentContainer: { display: 'flex', flexDirection: 'column', gap: 10 },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 50,
    },
  }),
);

// Whylabs Select Options

type SortOption = {
  label: string;
  value: string;
};

const SELECT_OPTIONS: SortOption[] = [
  { label: 'Argentina', value: 'Argentina' },
  { label: 'Australia', value: 'Australia' },
  { label: 'Brazil', value: 'Brazil' },
  { label: 'Canada', value: 'Canada' },
  { label: 'China', value: 'China' },
  { label: 'Denmark', value: 'Denmark' },
  { label: 'Finland', value: 'Finland' },
  { label: 'France', value: 'France' },
  { label: 'Germany', value: 'Germany' },
  { label: 'India', value: 'India' },
  { label: 'Italy', value: 'Italy' },
  { label: 'Japan', value: 'Japan' },
  { label: 'Mexico', value: 'Mexico' },
  { label: 'Netherlands', value: 'Netherlands' },
  { label: 'Norway', value: 'Norway' },
  { label: 'Poland', value: 'Poland' },
  { label: 'Spain', value: 'Spain' },
  { label: 'Sweden', value: 'Sweden' },
  { label: 'United Kingdom', value: 'United Kingdom' },
  { label: 'United States', value: 'United States' },
  { label: 'Other', value: 'Other' },
];

// WhyLabsCodeBlock content

const code = `from whylogs.core.feature_weights import FeatureWeights

# If you already have some feature weights in a dictionary of feature name to weights
weights = {"Feature_1": 12.4, "Feature_2": 93.3}

# You can upload these to Whylabs like this:
feature_weights = FeatureWeights(weights)
feature_weights.writer("whylabs").write()
`;

// WhyLabsCodeEditor settings

const updateConfig = async (newCode: string | undefined, setIsEdit: React.Dispatch<React.SetStateAction<boolean>>) => {
  setIsEdit(false);
};

const editableCode = `{
  "id": "351bf3cb-705a-4cb8-a727-1839e5052a1a",
  "schemaVersion": 1,
  "orgId": "org-0",
  "datasetId": "model-2130",
  "granularity": "daily",
  "metadata": {
      "schemaVersion": 1,
      "author": "system",
      "updatedTimestamp": 1671543872864,
      "version": 321
  },
}
`;

export default function DesignPlaygroundPage(): JSX.Element {
  const styles = useStyles();

  const [isBackgroundDark, setIsBackgroundDark] = useState(false);
  const [radioOption, setRadioOption] = useState<number>(0);
  const { enqueueSnackbar } = useWhyLabsSnackbar();
  const triggerNotification = (variant: 'success' | 'error' | 'warning' | 'info', title: string) => {
    enqueueSnackbar({ title, variant });
  };

  const { data: integrationCardsQueryData } = useGetIntegrationCardsQuery();

  const integrationCards: IntegrationCardType[] = useMemo(
    () =>
      integrationCardsQueryData?.integrationCards?.flatMap((integrationCard) => {
        if (!integrationCard) return [];

        return [
          {
            coming_soon: integrationCard.coming_soon || false,
            description: integrationCard.description || '',
            logo: integrationCard.logo || '',
            title: integrationCard.title || '',
            url: integrationCard.url || '',
            category: integrationCard.category || '',
          },
        ];
      }) ?? [],
    [integrationCardsQueryData],
  );

  /* eslint-disable no-alert */
  return (
    <div className={styles.container} style={{ background: isBackgroundDark ? '#e3e3e3' : 'white' }}>
      <IconButton onClick={() => setIsBackgroundDark(!isBackgroundDark)} style={{ position: 'fixed', right: 50 }}>
        <Brightness6Icon />
      </IconButton>

      <div className={styles.grid}>
        <div className={styles.componentContainer}>
          <span className={styles.label}>WhyLabsNotification</span>
          <WhyLabsButton
            variant="filled"
            onClick={() =>
              triggerNotification(
                'info',
                'Info notification - a very long text that will break the line, keeping the snack bar width consistent',
              )
            }
          >
            Info notification
          </WhyLabsButton>
          <WhyLabsButton variant="filled" onClick={() => triggerNotification('success', 'Success notification')}>
            Success notification
          </WhyLabsButton>
          <WhyLabsButton variant="filled" onClick={() => triggerNotification('warning', 'Warning notification')}>
            Warning notification
          </WhyLabsButton>
          <WhyLabsButton variant="filled" onClick={() => triggerNotification('error', 'Error notification')}>
            Error notification
          </WhyLabsButton>
        </div>
        <div className={styles.componentContainer}>
          <span className={styles.label}>WhyLabsSuperDatePicker</span>
          <WhyLabsSuperDatePicker timePeriod={TimePeriod.Pt1H} />
        </div>

        <div className={styles.componentContainer}>
          <span className={styles.label}>Resource Tags</span>
          <div style={{ display: 'flex', gap: '2px' }}>
            <Tag tag={{ key: 'Tag 1', value: 'Value 1', color: Colors.blue2 }} onClick={(tag) => alert(tag.value)} />
            <Tag
              tag={{ key: 'A longer key', value: 'with a correspondingly long value', color: Colors.red }}
              maxWidth={300}
              onClick={(tag) => alert(tag.value)}
            />
            <MoreTag count={5} onClick={() => alert('5 More tags')} />
          </div>
          <TagList
            tags={[
              { key: 'Tag 1', value: 'Value 1', color: Colors.blue2 },
              { key: 'A longer key', value: 'with a correspondingly long value', color: Colors.red },
              { key: 'Tag 3', value: 'Value 3', color: Colors.olive },
              { key: 'Tag 4', value: 'Value 4', color: Colors.chartOrange },
            ]}
            resourceId="model-foo"
            maxWidth={400}
          />
        </div>
        <div className={styles.componentContainer}>
          <span className={styles.label}>WhyLabsContextMenu Component</span>
          <WhyLabsContextMenu
            width={250}
            target={<WhyLabsButton variant="filled">Open menu</WhyLabsButton>}
            items={[
              {
                label: 'Open in profile view',
                section: 'Explore',
                onClick: () => enqueueSnackbar({ title: 'profile view clicked' }),
              },
              {
                label: 'Expand batch information',
                section: 'Explore',
                onClick: () => enqueueSnackbar({ title: 'batch information clicked' }),
              },
              {
                label: 'Mark alert as unhelpful',
                section: 'Actions',
                onClick: () => enqueueSnackbar({ title: 'Mark unhelpful clicked' }),
              },
            ]}
          />
        </div>
        <div className={styles.componentContainer}>
          <span className={styles.label}>WhyLabsAlert Component</span>
          <WhyLabsAlert
            dismissible
            title="Optional title"
            backgroundColor={Colors.brandSecondary200}
            icon={<IconInfoCircle size={20} />}
          >
            Voluptas illo asperiores aut asperiores illo est nobis ad ratione. Vel omnis deleniti. Dolorem et voluptuous
            veniam impedit repellat sed quia. Quos vero quasi eum accusantium.
          </WhyLabsAlert>
        </div>
        <div className={styles.componentContainer}>
          <span className={styles.label}>WhyLabsTabs Component</span>
          <WhyLabsTabs
            tabs={[
              {
                children: (
                  <p>
                    Voluptas illo asperiores aut asperiores illo est nobis ad ratione. Vel omnis deleniti. Dolorem et
                    voluptates veniam impedit repellat sed quia. Quos vero quasi eum accusantium.
                  </p>
                ),
                label: 'Text tab',
              },
              {
                children: (
                  <div>
                    <WhyLabsTextInput label="Insert a text" />
                    <WhyLabsNumberInput label="Insert a number" />
                  </div>
                ),
                label: 'Form tab',
              },
              {
                label: 'Empty tab',
              },
            ]}
          />
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.componentContainer}>
          <span className={styles.label}>WhyLabsSearchInput Component</span>
          <WhyLabsSearchInput label="Insert a text" />
        </div>
        <div className={styles.componentContainer}>
          <span className={styles.label}>WhyLabsTextInput Component</span>
          <WhyLabsTextInput label="Insert a text" />
        </div>
        <div className={styles.componentContainer}>
          <span className={styles.label}>WhyLabsNumberInput Component</span>
          <WhyLabsNumberInput label="Insert a number" />
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.componentContainer}>
          <span className={styles.label}>WhyLabsCheckboxGroup Component</span>
          <WhyLabsCheckboxGroup
            defaultValue={['option2']}
            label="Checkbox group"
            options={[
              { label: 'Option 1', value: 'option1' },
              { label: 'Option 2', value: 'option2' },
              { label: 'Option 3', value: 'option3' },
            ]}
          />
        </div>
        <div className={styles.componentContainer}>
          <span className={styles.label}>FormControlLabel & WhyRadio Components</span>
          <FormControlLabel
            value="60"
            control={<WhyRadio checked={radioOption === 0} onClick={() => setRadioOption(0)} />}
            label="Option 0"
          />
          <FormControlLabel
            value="1"
            control={<WhyRadio checked={radioOption === 1} onClick={() => setRadioOption(1)} />}
            label="Option 1"
          />
          <FormControlLabel
            value="2"
            control={<WhyRadio checked={radioOption === 2} onClick={() => setRadioOption(2)} />}
            label="Option 2"
          />
        </div>
      </div>
      <div className={styles.componentContainer}>
        <span className={styles.label}>WhyLabsSwitch Component</span>
        <WhyLabsSwitch defaultChecked label="Switch on" />
        <WhyLabsSwitch defaultChecked disabled label="Switch on disabled" />
        <WhyLabsSwitch label="Switch off" />
        <WhyLabsSwitch disabled label="Switch off disabled" />
      </div>

      <div className={styles.grid}>
        <div className={styles.componentContainer}>
          <span className={styles.label}>WhyLabsSelect Component</span>
          <WhyLabsSelect
            data={SELECT_OPTIONS}
            label="Single select input (item LabelWithLineBreak)"
            placeholder="Pick one"
            itemComponent={SelectCustomItems.LabelWithLineBreak}
          />
          <WhyLabsSelect
            data={SELECT_OPTIONS}
            label="Single select searchable=false"
            placeholder="You can't search here"
            searchable={false}
          />
          <WhyLabsSelect
            clearable
            data={SELECT_OPTIONS}
            defaultValue={SELECT_OPTIONS[5].value}
            label="Single select clearable=true (item LabelWithLineBreakAndAnomalyCount)"
            itemComponent={SelectCustomItems.LabelWithLineBreakAndAnomalyCount}
            placeholder="Pick one"
          />
          <WhyLabsSelect
            clearable={false}
            data={SELECT_OPTIONS}
            defaultValue={SELECT_OPTIONS[9].value}
            label="Single select clearable=false"
            placeholder="Pick one"
          />
        </div>
        <div className={styles.componentContainer}>
          <span className={styles.label}>WhyLabsMultiSelect Component</span>
          <WhyLabsMultiSelect data={SELECT_OPTIONS} label="Multi select input" placeholder="Pick as many as you want" />
          <WhyLabsMultiSelect
            data={SELECT_OPTIONS}
            label="Multi select searchable=false"
            placeholder="You can't search here"
            searchable={false}
          />
          <WhyLabsMultiSelect
            clearable
            data={SELECT_OPTIONS}
            defaultValue={[SELECT_OPTIONS[5].value]}
            label="Multi select clearable=true"
          />
          <WhyLabsMultiSelect
            clearable={false}
            data={SELECT_OPTIONS}
            defaultValue={[SELECT_OPTIONS[0].value, SELECT_OPTIONS[10].value]}
            label="Multi select clearable=false"
          />
        </div>
      </div>

      <div className={styles.componentContainer}>
        <span className={styles.label}>WhyLabsAutocomplete Component</span>

        <WhyLabsAutocomplete data={SELECT_OPTIONS} label="Autocomplete input" placeholder="Search country name" />
      </div>

      <div className={styles.grid}>
        <div className={styles.componentContainer}>
          <span className={styles.label}>WhyLabsSubmitButton Component</span>
          <WhyLabsSubmitButton>Submit</WhyLabsSubmitButton>
        </div>
        <div className={styles.componentContainer}>
          <span className={styles.label}>WhyLabsButton Component</span>
          <WhyLabsButton variant="filled">Filled button</WhyLabsButton>
          <WhyLabsButton variant="outline">Outlined button</WhyLabsButton>
          <WhyLabsButton variant="subtle">Subtle button</WhyLabsButton>
        </div>
      </div>

      <div className={styles.componentContainer}>
        <span className={styles.label}>WhyLabsTooltip Component</span>

        <WhyLabsTooltip position="top" label="Tooltip text">
          <p style={{ display: 'inline-block' }}>Hover to see WhyLabsTooltip</p>
        </WhyLabsTooltip>
      </div>

      {integrationCards[0] && (
        <div className={styles.componentContainer}>
          <span className={styles.label}>Integration Card Component</span>
          <div className={styles.componentContainer}>
            <IntegrationCard integrationItem={integrationCards[0]} />
          </div>
        </div>
      )}

      <div className={styles.grid}>
        <div className={styles.componentContainer}>
          <span className={styles.label}>WhyLabsCodeBlock Component</span>
          <WhyLabsTooltip position="top" label="WhyLabsCodeBlock">
            <WhyLabsCodeBlock code={code} language="python" />
          </WhyLabsTooltip>
        </div>
        <div className={styles.componentContainer}>
          <div>
            <span className={styles.label}>WhyLabsCodeEditor Component</span>
            <WhyLabsTooltip position="top" label="WhyLabsCodeEditor">
              <WhyLabsCodeEditor
                code={editableCode}
                isLoading={false}
                updateConfig={updateConfig}
                showEdit
                userCanEdit
              />
            </WhyLabsTooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
