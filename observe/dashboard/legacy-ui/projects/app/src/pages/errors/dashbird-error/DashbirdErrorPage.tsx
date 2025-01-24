import ExternalLink from 'components/link/ExternalLink';
import { WhyDogStop } from 'components/animated-components/whydog/WhyDogStop';
import { WhyLabsText } from 'components/design-system';
import { AttentionPageWrap } from '../../atention-page/AttentionPageWrap';
import { DashbirdError } from '../../../utils/error-utils';

interface DashbirdErrorPageProps {
  error: DashbirdError;
}

const DashbirdErrorPage: React.FC<DashbirdErrorPageProps> = ({ error }) => {
  return (
    <AttentionPageWrap title="UH OH!" subtitle={error.extensions.safeErrorMsg} dog={<WhyDogStop />}>
      <WhyLabsText>
        Please try refreshing the page or <ExternalLink to="support">contact support</ExternalLink> if the problem
        persists.
      </WhyLabsText>
    </AttentionPageWrap>
  );
};

export default DashbirdErrorPage;
