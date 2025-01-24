import { Link } from 'react-router-dom';
import WhyDogIdle from 'components/animated-components/whydog/WhyDogIdle';
import DogDialogQuestionMark from 'components/animated-components/whydog/whydog-dialog/DogDialogQuestionMark';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { AttentionPageWrap } from '../atention-page/AttentionPageWrap';

export function NoDataMessagePage(): JSX.Element {
  const { getNavUrl } = useNavLinkHandler();
  return (
    <AttentionPageWrap
      title="What happened here?"
      subtitle="It looks like you haven't uploaded any batch profile data for this resource."
      dog={<WhyDogIdle dialog={<DogDialogQuestionMark />} />}
    >
      Hop to the <Link to={getNavUrl({ page: 'getStarted' })}>quick start guide</Link> for instructions!
    </AttentionPageWrap>
  );
}
