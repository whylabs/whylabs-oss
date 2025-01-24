import DogDialogGoBack from 'components/animated-components/whydog/whydog-dialog/DogDialogGoBack';
import { WhyDogStop } from 'components/animated-components/whydog/WhyDogStop';
import { AttentionPageWrap } from 'pages/atention-page/AttentionPageWrap';

const NotFoundPage: React.FC = () => (
  <AttentionPageWrap
    title="UH OH!"
    subtitle="It appears that the content you were looking for does not exist at this location."
    dog={<WhyDogStop dialog={<DogDialogGoBack />} />}
  >
    In fact, nothing at all exists at this location. Turn back, adventurer, for the void you gaze upon is too much to
    bear for mortal visual sensory organs.
  </AttentionPageWrap>
);

export default NotFoundPage;
