import { createStyles } from '@mantine/core';
import { IconCopy } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import { useWhyLabsSnackbar } from '~/hooks/useWhyLabsSnackbar';

import { WhyLabsText, WhyLabsTooltip } from '../design-system';

type LabelCopyActionProps = {
  label: string;
  value: string;
  overrideLabelStyle?: string;
  overrideIconStyle?: string;
  overrideToastText?: string;
};

const useLabelCopyActionStyles = createStyles({
  labelDefault: {
    fontSize: 12,
    color: Colors.brandSecondary600,
    lineHeight: 1.5,
    fontWeight: 400,
    display: 'flex',
    alignItems: 'center',
    padding: '4px 0',
  },
  iconDefault: {
    width: 20,
    margin: '0 8px',
    cursor: 'pointer',
  },
});

export const LabelCopyAction = ({
  label,
  value,
  overrideLabelStyle,
  overrideIconStyle,
  overrideToastText,
}: LabelCopyActionProps) => {
  const { classes: labelStyles } = useLabelCopyActionStyles();
  const { enqueueSnackbar } = useWhyLabsSnackbar();

  function onCopy() {
    navigator.clipboard.writeText(value).then(() =>
      enqueueSnackbar({
        title: overrideToastText || 'Copied to clipboard!',
      }),
    );
  }

  return (
    <WhyLabsText inherit className={overrideLabelStyle || labelStyles.labelDefault}>
      {label}
      <WhyLabsTooltip label="Copy" withinPortal={false}>
        <IconCopy className={overrideIconStyle || labelStyles.iconDefault} onClick={onCopy} />
      </WhyLabsTooltip>
    </WhyLabsText>
  );
};
