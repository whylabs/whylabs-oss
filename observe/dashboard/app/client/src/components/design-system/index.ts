import * as WhyLabsAccordion from './accordion/WhyLabsAccordion';
import OverLimitAlert from './alert/OverLimitAlert';
import WhyLabsAlert from './alert/WhyLabsAlert';
import WhyLabsAnchor from './anchor/WhyLabsAnchor';
import WhyLabsAutocomplete from './autocomplete/WhyLabsAutocomplete';
import WhyLabsBadge from './badge/WhyLabsBadge';
import { WhyLabsBreadCrumbItem, WhyLabsBreadCrumbs } from './bread-crumbs/WhyLabsBreadCrumbs';
import WhyLabsButton from './button/WhyLabsButton';
import { WhyLabsCloseButton } from './button/WhyLabsCloseButton';
import WhyLabsSubmitButton from './button/WhyLabsSubmitButton';
import { WhyLabsCard } from './card/WhyLabsCard';
import WhyLabsCheckboxGroup from './checkbox/WhyLabsCheckboxGroup';
import { WhyLabsContextMenu } from './context-menu/WhyLabsContextMenu';
import WhyLabsDatePicker from './datepicker/WhyLabsDatePicker';
import { WhyLabsDrawer } from './drawer/WhyLabsDrawer';
import WhyLabsDropDown from './drop-down/WhyLabsDropDown';
import { SectionTitle } from './general/SectionTitle';
import WhyLabsActionIcon from './icon/WhyLabsActionIcon';
import WhyLabsTextInput from './input/WhyLabsTextInput';
import { WhyLabsDivider } from './layout/WhyLabsDivider';
import WhyLabsSpace from './layout/WhyLabsSpace';
import WhyLabsLoadingOverlay from './loading-overlay/WhyLabsLoadingOverlay';
import { ConfirmLosingChangesDialog } from './modal/ConfirmLosingChangesDialog';
import WhyLabsConfirmationDialog from './modal/WhyLabsConfirmationDialog';
import WhyLabsModal from './modal/WhyLabsModal';
import WhyLabsNumberInput, { WhyLabsInputNumberProps } from './number-input/WhyLabsNumberInput';
import WhyLabsRadioGroup, { WhyLabsRadioGroupOptions } from './radio-group/WhyLabsRadioGroup';
import Cells from './responsive-table/cells';
import Footer from './responsive-table/footer';
import TableComponents from './responsive-table/WhyLabsTable';
import WhyLabsSearchInput from './search-input/WhyLabsSearchInput';
import WhyLabsSegmentedControl from './segmented-control/WhyLabsSegmentedControl';
import { GenericFlexColumnItem, GenericFlexColumnSelectItemData } from './select/custom-items/GenericFlexColumnItem';
import { GenericFlexColumnItemWithoutIcon } from './select/custom-items/GenericFlexColumnItemWithoutIcon';
import { LabelWithLineBreak } from './select/custom-items/LabelWithLineBreak';
import { LabelWithLineBreakAndAnomalyCount } from './select/custom-items/LabelWithLineBreakAndAnomalyCountItem';
import WhyLabsMultiSelect, { WhyLabsMultiSelectProps } from './select/WhyLabsMultiSelect';
import WhyLabsSelect, { WhyLabsSelectProps } from './select/WhyLabsSelect';
import WhyLabsSelectWithButtons from './select/WhyLabsSelectWithButtons';
import { SkeletonGroup } from './skeleton/SkeletonGroup';
import WhyLabsSwitch from './switch/WhyLabsSwitch';
import { createTabBarComponents } from './tab-bar/TabBarArea';
import { Tab, WhyLabsControlledTabs } from './tabs/WhyLabsControlledTabs';
import WhyLabsTabs from './tabs/WhyLabsTabs';
import WhyLabsTextArea from './text-area/WhyLabsTextArea';
import WhyLabsTextHighlight from './text-highlight/WhyLabsTextHighlight';
import { SelectorRowText } from './text/SelectorRowText';
import { WhyLabsEditableText } from './text/WhyLabsEditableText';
import WhyLabsText from './text/WhyLabsText';
import { TooltipWrapper } from './tooltip/TooltipWrapper';
import WhyLabsTooltip from './tooltip/WhyLabsTooltip';
import WhyLabsTitle from './typography/WhyLabsTitle';

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
  createTabBarComponents,
  OverLimitAlert,
  SelectCustomItems,
  TooltipWrapper,
  WhyLabsAccordion,
  WhyLabsActionIcon,
  WhyLabsAlert,
  WhyLabsAnchor,
  WhyLabsAutocomplete,
  WhyLabsBadge,
  WhyLabsButton,
  WhyLabsCard,
  WhyLabsCheckboxGroup,
  WhyLabsCloseButton,
  WhyLabsContextMenu,
  WhyLabsDivider,
  WhyLabsDrawer,
  WhyLabsLoadingOverlay,
  WhyLabsDatePicker,
  WhyLabsModal,
  WhyLabsConfirmationDialog,
  ConfirmLosingChangesDialog,
  WhyLabsMultiSelect,
  WhyLabsNumberInput,
  WhyLabsSpace,
  WhyLabsSearchInput,
  WhyLabsSegmentedControl,
  WhyLabsSelect,
  WhyLabsSelectWithButtons,
  WhyLabsSubmitButton,
  WhyLabsSwitch,
  WhyLabsTableKit,
  WhyLabsTabs,
  WhyLabsControlledTabs,
  WhyLabsEditableText,
  WhyLabsText,
  SelectorRowText,
  WhyLabsTextInput,
  WhyLabsTextArea,
  WhyLabsTooltip,
  WhyLabsDropDown,
  SkeletonGroup,
  WhyLabsTitle as WhyLabsTypography,
  WhyLabsTextHighlight,
  SectionTitle,
  WhyLabsRadioGroup,
  WhyLabsBreadCrumbs,
  type WhyLabsRadioGroupOptions,
  type WhyLabsMultiSelectProps,
  type WhyLabsSelectProps,
  type WhyLabsInputNumberProps,
  type WhyLabsBreadCrumbItem,
  type GenericFlexColumnSelectItemData,
  type Tab,
};
