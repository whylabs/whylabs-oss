import { FC, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from 'hooks/useUser';
import { useProvisionOrgMutation } from 'generated/graphql';
import { UnknownErrorPage } from 'pages/errors';
import { AttentionPageWrap } from 'pages/atention-page/AttentionPageWrap';
import { CircularProgress } from '@material-ui/core';
import { PageBases } from 'pages/page-types/pageType';
import GlobalLoader from 'components/global-loader/GlobalLoader';

export const NewUserPage: FC = () => {
  // poll user state every few seconds to see if provisioning is done
  // TODO: add a limit to how long we wait here with an option to contact support
  const { loading, error, hasOrg, user } = useUser(3000);
  const [provisionOrg, { error: provisioningError }] = useProvisionOrgMutation({
    variables: {
      // would be a good place to ask the user for their input
      orgName: null,
      modelName: null,
    },
  });

  useEffect(() => {
    async function provisionTheOrg() {
      try {
        await provisionOrg();
      } catch (err) {
        console.error(`Failed to trigger provisioning for user ${user?.auth0Id}: ${err}`);
      }
    }

    // only trigger provisioning if we've successfully loaded user state and they have no org
    if (!loading && !error && user && !hasOrg) {
      provisionTheOrg();
    }
  }, [provisionOrg, hasOrg, loading, error, user]);

  // dont know user state yet
  if (loading) return <GlobalLoader wholeScreen />;

  // something went wrong fetching user or provisioning org
  if (error || provisioningError) return <UnknownErrorPage />;

  // if org doesnt yet exist, show a loading indicator
  if (!hasOrg) {
    return (
      <AttentionPageWrap title="Hang on!">
        We&apos;re provisioning your WhyLabs account...
        <div>
          <CircularProgress />
        </div>
      </AttentionPageWrap>
    );
  }

  // redirect to get started page if (or once) the user has an org
  return <Navigate to={PageBases.getStarted} />;
};
