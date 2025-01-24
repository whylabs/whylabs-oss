import { Colors, HtmlTooltip } from '@whylabs/observatory-lib';
import useTypographyStyles from 'styles/Typography';
import { createStyles } from '@mantine/core';
import SelectAutoComplete, { SelectAutoCompleteProps } from './SelectAutoComplete';

const useSelectStyles = createStyles({
  toolTip: {
    paddingBottom: '1px',
  },
  width: {
    width: '100%',
  },
});

interface SelectAutoCompleteWithLabelProps extends SelectAutoCompleteProps {
  label: React.ReactNode | string;
  tooltip?: string;
  classes?: {
    root?: string;
    inputRoot?: string;
  };
}

export const SelectAutoCompleteWithLabel: React.FC<SelectAutoCompleteWithLabelProps> = ({
  options,
  value,
  onChange,
  id,
  disabled = false,
  label,
  tooltip,
  classes,
  card,
  placeholder,
  required,
  inputRootClass,
}) => {
  const { classes: styles, cx } = useSelectStyles();
  const { classes: typographyStyles } = useTypographyStyles();
  return (
    <div className={cx(typographyStyles.cellTitle, classes?.root ?? '', !tooltip ? styles.toolTip : '', styles.width)}>
      <span style={{ lineHeight: 1.42, fontSize: 14, fontWeight: 600, color: Colors.brandSecondary900 }}>
        {label}
        {tooltip && <HtmlTooltip tooltipContent={tooltip || ''} />}{' '}
      </span>
      <SelectAutoComplete
        inputRootClass={inputRootClass}
        required={required}
        placeholder={placeholder}
        card={card}
        options={options}
        value={value}
        id={id}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
};
