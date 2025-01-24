import WhyLabsBadge from './badge/WhyLabsBadge';
import WhyLabsButton from './button/WhyLabsButton';
import WhyLabsLinkButton from './button/WhyLabsLinkButton';
import WhyLabsCheckboxGroup from './checkbox/WhyLabsCheckboxGroup';
import WhyLabsRadioGroup from './radio/WhyLabsRadioGroup';
import WhyLabsSubmitButton from './button/WhyLabsSubmitButton';
import WhyLabsNumberInput from './number-input/WhyLabsNumberInput';
import WhyLabsTextInput from './input/WhyLabsTextInput';
import WhyLabsTextArea from './text-area/WhyLabsTextArea';
import WhyLabsSearchInput from './search-input/WhyLabsSearchInput';
import WhyLabsSelect from './select/WhyLabsSelect';
import WhyLabsMultiSelect, { WhyLabsMultiSelectProps } from './select/WhyLabsMultiSelect';
import WhyLabsSwitch from './switch/WhyLabsSwitch';
import WhyLabsTooltip from './tooltip/WhyLabsTooltip';
import { TooltipWrapper } from './tooltip/TooltipWrapper';
import WhyLabsTextHighlight from './text-highlight/WhyLabsTextHighlight';
import WhyLabsAlert from './alert/WhyLabsAlert';
import WhyLabsModal from './modal/WhyLabsModal';
import WhyLabsConfirmationDialog from './modal/WhyLabsConfirmationDialog';
import { WhyLabsDrawer } from './drawer/WhyLabsDrawer';
import { WhyLabsCloseButton } from './button/WhyLabsCloseButton';
import WhyLabsAutocomplete from './autocomplete/WhyLabsAutocomplete';
import WhyLabsActionIcon from './icon/WhyLabsActionIcon';
import TableComponents from './responsive-table/WhyLabsTable';
import WhyLabsTabs from './tabs/WhyLabsTabs';
import { WhyLabsControlledTabs, Tab } from './tabs/WhyLabsControlledTabs';
import Cells from './responsive-table/cells';
import Footer from './responsive-table/footer';
import WhyLabsTypography from './typography/WhyLabsTypography';
import WhyLabsText from './text/WhyLabsText';
import WhyLabsAnchor from './anchor/WhyLabsAnchor';
import WhyLabsLoadingOverlay from './loading-overlay/WhyLabsLoadingOverlay';
import { LabelWithLineBreakAndAnomalyCount } from './select/custom-items/LabelWithLineBreakAndAnomalyCountItem';
import WhyLabsSegmentedControl from './segmented-control/WhyLabsSegmentedControl';
import { WhyLabsContextMenu, WhyLabsContextMenuItem } from './contex-menu/WhyLabsContextMenu';
import { LabelWithLineBreak } from './select/custom-items/LabelWithLineBreak';
import WhyLabsDropDown from './drop-down/WhyLabsDropDown';
import { SkeletonGroup } from './skeleton/SkeletonGroup';
import WhyLabsProgressBar from './progress-bar/WhyLabsProgressBar';
import * as WhyLabsAccordion from './accordion/WhyLabsAccordion';
import { GenericFlexColumnItem, GenericFlexColumnSelectItemData } from './select/custom-items/GenericFlexColumnItem';
import { SelectorRowText } from './text/SelectorRowText';
import { GenericFlexColumnItemWithoutIcon } from './select/custom-items/GenericFlexColumnItemWithoutIcon';

const WhyLabsTableKit = {
  Components: TableComponents,
  Cells,
  Footer,
};

const SelectCustomItems = {
  LabelWithLineBreakAndAnomalyCount,
  LabelWithLineBreak,
  GenericFlexColumnItem,
  GenericFlexColumnItemWithoutIcon,
};

export {
  WhyLabsAlert,
  WhyLabsBadge,
  WhyLabsButton,
  WhyLabsCloseButton,
  WhyLabsLinkButton,
  WhyLabsCheckboxGroup,
  WhyLabsRadioGroup,
  WhyLabsSubmitButton,
  WhyLabsNumberInput,
  WhyLabsTextInput,
  WhyLabsSelect,
  WhyLabsMultiSelect,
  WhyLabsSwitch,
  WhyLabsTooltip,
  TooltipWrapper,
  WhyLabsModal,
  WhyLabsConfirmationDialog,
  WhyLabsAutocomplete,
  WhyLabsActionIcon,
  WhyLabsTableKit,
  WhyLabsTabs,
  WhyLabsControlledTabs,
  WhyLabsTypography,
  SelectorRowText,
  WhyLabsText,
  WhyLabsAnchor,
  WhyLabsSearchInput,
  WhyLabsLoadingOverlay,
  SelectCustomItems,
  WhyLabsSegmentedControl,
  WhyLabsContextMenu,
  WhyLabsDrawer,
  WhyLabsAccordion,
  WhyLabsDropDown,
  SkeletonGroup,
  WhyLabsProgressBar,
  WhyLabsTextHighlight,
  WhyLabsTextArea,
};
export type { GenericFlexColumnSelectItemData, WhyLabsContextMenuItem, WhyLabsMultiSelectProps, Tab };
