import ExternalLink from 'components/link/ExternalLink';
import { TARGET_ORG_QUERY_NAME } from 'graphql/apollo';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { WhyDogStop } from 'components/animated-components/whydog/WhyDogStop';
import { WhyLabsText } from 'components/design-system';
import { createStyles } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { InvisibleButton } from 'components/buttons/InvisibleButton';
import { getParam } from 'pages/page-types/usePageType';
import { useCommonStyles } from 'hooks/useCommonStyles';
import { AttentionPageWrap } from '../../atention-page/AttentionPageWrap';

const useStyles = createStyles({
  link: {
    color: Colors.linkColor,
    textDecoration: 'underline',
    fontSize: 18,
    fontFamily: 'Asap, sans-serif',
    flexShrink: 0,
    maxWidth: `11em`,
    width: 'auto',
  },
});

const InvalidOrganizationErrorPage: React.FC = () => {
  const targetOrg = getParam(TARGET_ORG_QUERY_NAME);
  const { getNavUrlWithoutOrg } = useNavLinkHandler();
  const { classes } = useStyles();
  const { classes: commonClasses } = useCommonStyles();
  const fallbackUrl = getNavUrlWithoutOrg({ page: 'home', ignoreOldQueryString: true });
  return (
    <AttentionPageWrap
      title="UH OH!"
      subtitle={`It looks like organization ${targetOrg} does not exist or you do not have permission to access it.`}
      dog={<WhyDogStop />}
    >
      <WhyLabsText inherit className={commonClasses.commonFont}>
        <InvisibleButton
          className={classes.link}
          onClick={() => {
            window.location.href = fallbackUrl;
          }}
        >
          {'Click here '}
        </InvisibleButton>
        {' to return to your default organization or create a new one.'}
      </WhyLabsText>
      <br />
      <WhyLabsText inherit className={commonClasses.commonFont}>
        Please <ExternalLink to="support">contact support</ExternalLink> if the problem persists.
      </WhyLabsText>
    </AttentionPageWrap>
  );
};

export default InvalidOrganizationErrorPage;
