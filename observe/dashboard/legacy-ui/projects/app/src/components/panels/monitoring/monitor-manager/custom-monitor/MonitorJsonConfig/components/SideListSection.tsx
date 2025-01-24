import { useEffect, useRef, useState } from 'react';
import { createStyles, Group } from '@mantine/core';
import { Colors, SafeLink } from '@whylabs/observatory-lib';
import {
  WhyLabsAccordion,
  WhyLabsAlert,
  WhyLabsButton,
  WhyLabsModal,
  WhyLabsSegmentedControl,
  WhyLabsText,
} from 'components/design-system';
import { getParam, usePageTypeWithParams } from 'pages/page-types/usePageType';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { IconArrowLeft, IconInfoCircle } from '@tabler/icons';
import { useResizeObserver } from '@mantine/hooks';
import useFilterQueryString, { FilterKeys } from 'hooks/useFilterQueryString';
import { AssetCategory, useGetModelAttributesForHelpersValidationQuery } from 'generated/graphql';
import { EDITING_KEY } from 'types/navTags';
import { useResourceContext } from 'pages/model-page/hooks/useResourceContext';
import { AVAILABLE_PRESETS, JsonPreset, JsonPresets, NO_PRESET_ID } from '../presets/types';
import { ADVANCED_DOC_LINK, mountDocumentationTooltip } from './CheckListCommonItems';
import { CODE_HELPERS, CodeHelper, ListOption, segmentedControlOptions, SideListSectionProps } from './utils';
import { customJsonAnalyzerPresetsMapper } from '../presets';

const useChecklistStyles = createStyles((_, infoCardHeight: number) => ({
  accordionItem: {
    padding: '8px',
    background: 'white',
  },
  fixedInfo: {
    background: 'white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'end',
    flexDirection: 'column',
    overflow: 'auto',
  },
  controlLabel: {
    color: Colors.brandSecondary900,
  },
  flex: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    padding: '8px 16px 16px 16px',
  },
  shadow: {
    boxShadow: '8px 4px 8px rgba(0, 0, 0, 0.15)',
    transition: 'box-shadow 0.2s ease-in',
  },
  noShadow: {
    boxShadow: 'unset',
    transition: 'box-shadow 0.2s ease-out',
  },
  alertWrapper: {
    padding: '16px',
  },
  infoCard: {
    padding: '16px 12px',
  },
  scrollArea: {
    overflow: 'auto',
    height: `calc(100% - 8px - ${infoCardHeight}px)`,
    display: 'flex',
    flexDirection: 'column',
    marginTop: '8px',
    color: Colors.secondaryLight1000,
  },
  checklistContainer: {
    '& a': {
      color: Colors.linkColor,
    },
    '& .checklist-tooltip-link': {
      color: Colors.white,
    },
    '& pre': {
      background: Colors.brandSecondary300,
      fontSize: '13px',
      padding: '1px 6px',
      color: 'black',
      borderRadius: 2,
      display: 'inline',
    },
    '& ol': {
      paddingLeft: '24px',
      '& li span.red-text': {
        color: 'red',
        fontWeight: 600,
      },
    },
  },
  additionalInfo: {
    '& span.red-text': {
      color: 'red',
      fontWeight: 600,
    },
  },
}));

export const SideListSection: React.FC<SideListSectionProps> = ({ activePreset, applyPreset }) => {
  const [fixedInfoRef, fixedIntoRect] = useResizeObserver();
  const { classes, cx } = useChecklistStyles(fixedIntoRect.height);
  const {
    resourceState: { resource },
  } = useResourceContext();
  const isEdit = getParam(EDITING_KEY) === 'true';
  const [confirmApplyPreset, setConfirmApplyPreset] = useState<string>();
  const { handleNavigation } = useNavLinkHandler();
  const { modelId } = usePageTypeWithParams();
  const currentChecklistRef = useRef<HTMLDivElement>(null);
  const scrollItemsRef = useRef<HTMLDivElement>(null);
  const [listToggle, setListToggle] = useState<ListOption>(isEdit ? 'helpers' : 'presets');
  const { data: helpersInfo, error } = useGetModelAttributesForHelpersValidationQuery({
    variables: { datasetId: modelId },
  });
  const { addFiltersToQueryParams } = useFilterQueryString(FilterKeys.searchString);

  if (error) {
    console.log(`failed to fetch resource data in code helpers: `, error);
  }
  const mapPreset = (presetId: string, preset?: JsonPreset): JSX.Element | null => {
    if (!preset || !preset.checkList) return null;
    const { checkList } = preset;
    return (
      <div ref={presetId === activePreset ? currentChecklistRef : null}>
        <WhyLabsAccordion.Item value={presetId}>
          <WhyLabsAccordion.Title style={{ color: Colors.secondaryLight1000 }}>
            {preset.presetName}
          </WhyLabsAccordion.Title>
          <WhyLabsAccordion.Content className={cx(classes.checklistContainer, classes.accordionItem)}>
            <div>{checkList.description}</div>
            <ol>{checkList.configurationSteps.map((i) => i)}</ol>
            <div className={classes.additionalInfo}>{checkList.additionalInfo}</div>
            <div style={{ paddingTop: '12px', width: 'fit-content' }}>
              <WhyLabsButton
                variant="outline"
                color="gray"
                onClick={() => setConfirmApplyPreset(presetId)}
                leftIcon={<IconArrowLeft stroke={1} size={18} />}
              >
                Insert this preset code
              </WhyLabsButton>
            </div>
          </WhyLabsAccordion.Content>
        </WhyLabsAccordion.Item>
      </div>
    );
  };

  const mapHelper = ({ component, emptyState, showEmptyState, id, name }: CodeHelper): React.ReactNode => {
    if (!helpersInfo?.model) return null;
    const showEmptyComponent = showEmptyState?.(helpersInfo.model);
    const HelperComponent = showEmptyComponent && emptyState ? emptyState : component;
    return (
      <WhyLabsAccordion.Item value={id}>
        <WhyLabsAccordion.Title style={{ color: Colors.secondaryLight1000 }}>{name}</WhyLabsAccordion.Title>
        <WhyLabsAccordion.Content className={classes.accordionItem}>
          <HelperComponent />
        </WhyLabsAccordion.Content>
      </WhyLabsAccordion.Item>
    );
  };

  useEffect(() => {
    currentChecklistRef?.current?.scrollIntoView({ behavior: 'smooth' });
    addFiltersToQueryParams([]);
  }, [addFiltersToQueryParams]);

  const applySelectedPreset = () => {
    setConfirmApplyPreset(undefined);
    handleNavigation({
      page: 'monitorManager',
      modelId,
      monitorManager: { path: 'customize-json', id: confirmApplyPreset },
    });
    applyPreset(confirmApplyPreset ?? NO_PRESET_ID);
  };

  const renderBannerContent = (): JSX.Element => {
    return (
      <>
        More setup details can be found in the{' '}
        <SafeLink style={{ color: Colors.blue }} href={ADVANCED_DOC_LINK}>
          docs website
        </SafeLink>{' '}
        or by the following direct links in the {mountDocumentationTooltip(ADVANCED_DOC_LINK)}
        tooltips.
      </>
    );
  };

  const showLLMPresets = resource?.category === AssetCategory.Llm;

  const [scrollAreaTop, setScrollAreaTop] = useState(0);
  return (
    <>
      <div ref={fixedInfoRef} className={cx(classes.fixedInfo, scrollAreaTop ? classes.shadow : classes.noShadow)}>
        {!isEdit && (
          <div className={classes.flex}>
            <WhyLabsText size={14} className={classes.controlLabel}>
              Filter by:
            </WhyLabsText>
            <WhyLabsSegmentedControl
              onChange={(value: ListOption) => setListToggle(value)}
              data={segmentedControlOptions}
              color="gray"
            />
          </div>
        )}
        <WhyLabsAlert
          dismissible
          className={classes.infoCard}
          backgroundColor={Colors.brandSecondary200}
          icon={<IconInfoCircle size={20} />}
          padding="0 16px 16px 16px"
        >
          {renderBannerContent()}
        </WhyLabsAlert>
      </div>
      <div
        className={classes.scrollArea}
        ref={scrollItemsRef}
        onScroll={(e) => {
          const target = e.target as HTMLDivElement;
          if (target.scrollTop > 10 && scrollAreaTop === 0) {
            setScrollAreaTop(target.scrollTop);
          }
          if (target.scrollTop < 10 && scrollAreaTop > 0) {
            setScrollAreaTop(0);
          }
        }}
      >
        {listToggle === 'presets' && (
          <WhyLabsAccordion.Root defaultValue={activePreset || NO_PRESET_ID}>
            {AVAILABLE_PRESETS.filter((p) => p.includes('llm') === showLLMPresets).map((presetId) => {
              const preset = customJsonAnalyzerPresetsMapper.get(presetId as JsonPresets);
              return mapPreset(presetId, preset);
            })}
          </WhyLabsAccordion.Root>
        )}
        {listToggle === 'helpers' && (
          <WhyLabsAccordion.Root defaultValue={CODE_HELPERS[0].id}>{CODE_HELPERS.map(mapHelper)}</WhyLabsAccordion.Root>
        )}
      </div>

      <WhyLabsModal
        title="Insert this preset code"
        opened={!!confirmApplyPreset}
        onClose={() => setConfirmApplyPreset(undefined)}
      >
        By inserting the new preset&apos;s code you will lose the changes applied to your currently edited preset. Do
        you want to continue?
        <Group position="right">
          <WhyLabsButton variant="outline" color="gray" onClick={() => setConfirmApplyPreset(undefined)}>
            Cancel
          </WhyLabsButton>
          <WhyLabsButton variant="outline" color="primary" onClick={applySelectedPreset}>
            Continue
          </WhyLabsButton>
        </Group>
      </WhyLabsModal>
    </>
  );
};
