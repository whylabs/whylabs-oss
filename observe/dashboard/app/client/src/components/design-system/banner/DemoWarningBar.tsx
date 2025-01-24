import { Colors } from '~/assets/Colors';
import { useIsDemoOrg } from '~/hooks/useIsDemoOrg';
import { useWhyLabsSnackbar } from '~/hooks/useWhyLabsSnackbar';
import { forceRedirectToOrigin } from '~/utils/oldStackUtils';

import WhyLabsText from '../text/WhyLabsText';
import WhyLabsTooltip from '../tooltip/WhyLabsTooltip';
import { WarningBar } from './WarningBar';

const getDemoOrgTooltipContent = () => {
  return (
    <>
      <WhyLabsText size={12}>
        You can browse around, but won&apos;t be able to make any changes to this organization.
      </WhyLabsText>
      <WhyLabsText size={12}>
        Use the organization dropdown on the Project Dashboard page to select a different organization.
      </WhyLabsText>
    </>
  );
};

export const DemoWarningBar = () => {
  const { enqueueSnackbar } = useWhyLabsSnackbar();

  const isDemoOrg = useIsDemoOrg();

  if (!isDemoOrg) {
    // show nothing for non-demo orgs
    return null;
  }

  const handleExitDemo = () => {
    enqueueSnackbar({ title: 'Exiting demo mode!', variant: 'info' });

    // redirect the user to the main page
    forceRedirectToOrigin();
  };

  return (
    <WarningBar color="info" button={{ label: 'Exit demo mode', onClick: handleExitDemo }} id="demo-warning">
      You are in a{' '}
      <WhyLabsTooltip wrapChildren={false} label={getDemoOrgTooltipContent()}>
        <u style={{ borderBottom: `1px dotted ${Colors.white}`, textDecoration: 'none' }}>read-only demo org</u>
      </WhyLabsTooltip>
      . Feel free to check out some of the features that our platform has to offer!
    </WarningBar>
  );
};
