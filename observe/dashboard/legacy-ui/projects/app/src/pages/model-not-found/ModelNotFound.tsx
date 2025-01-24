import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { AttentionPageWrap } from 'pages/atention-page/AttentionPageWrap';
import { Link } from 'react-router-dom';
import WhyDogIdle from 'components/animated-components/whydog/WhyDogIdle';
import DogDialogQuestionMark from 'components/animated-components/whydog/whydog-dialog/DogDialogQuestionMark';
import { useUserContext } from 'hooks/useUserContext';

export default function ModelNotFoundPage(): JSX.Element {
  const { getNavUrl } = useNavLinkHandler();
  const { getCurrentUser } = useUserContext();
  const user = getCurrentUser();
  let message = `It looks like the model you are trying to access does not exist`;
  if (user?.organization?.name) {
    message += ` in the organization "${user?.organization?.name}"`;
  }

  return (
    <AttentionPageWrap
      title="Model not found!"
      dog={<WhyDogIdle dialog={<DogDialogQuestionMark />} />}
      subtitle={message}
    >
      Navigate back to <Link to={getNavUrl({ page: 'home' })}>model overview page!</Link>
    </AttentionPageWrap>
  );
}
