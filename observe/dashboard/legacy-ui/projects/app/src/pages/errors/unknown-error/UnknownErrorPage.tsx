import { ErrorPage } from 'pages/errors/ErrorPage';
import ExternalLink from 'components/link/ExternalLink';
import { WhyLabsText } from 'components/design-system';

const UnknownErrorPage: React.FC = () => (
  <ErrorPage pageTitle="Uh oh!">
    <WhyLabsText style={{ textAlign: 'justify' }} variant="text">
      We encountered an error. Please try refreshing the page or{' '}
      <ExternalLink to="support">contact support</ExternalLink> if the problem persists.
    </WhyLabsText>
  </ErrorPage>
);

export default UnknownErrorPage;
