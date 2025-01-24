import { Radio, RadioProps, withStyles } from '@material-ui/core';
import { Colors } from '@whylabs/observatory-lib';

const WhyRadio = withStyles({
  root: {
    color: Colors.brandSecondary900,
    '&$checked': {
      color: Colors.brandPrimary700,
    },
    '&.Mui-disabled': {
      color: Colors.brandSecondary300,
    },
  },
  checked: {},
})((props: RadioProps) => <Radio size="small" color="default" {...props} />);

export default WhyRadio;
