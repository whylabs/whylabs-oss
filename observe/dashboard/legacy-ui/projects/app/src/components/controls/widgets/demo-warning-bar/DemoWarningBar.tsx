import { Colors } from '@whylabs/observatory-lib';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { useIsDemoOrg } from 'hooks/useIsDemoOrg';
import { WhyLabsText, WhyLabsTooltip } from 'components/design-system';
import { WarningBar } from 'components/design-system/banner/WarningBar';
import { useWhyLabsSnackbar } from 'hooks/useWhyLabsSnackbar';

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

export const DemoWarningBar: React.FC = () => {
  const { handleNavigationWithoutOrg } = useNavLinkHandler();
  const { enqueueSnackbar } = useWhyLabsSnackbar();

  const isDemoOrg = useIsDemoOrg();

  if (!isDemoOrg) {
    // show nothing for non-demo orgs
    return null;
  }

  const handleExitDemo = () => {
    enqueueSnackbar({ title: 'Exiting demo mode!', variant: 'info' });

    // redirect the user to the main page
    handleNavigationWithoutOrg({ page: 'home' });
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
