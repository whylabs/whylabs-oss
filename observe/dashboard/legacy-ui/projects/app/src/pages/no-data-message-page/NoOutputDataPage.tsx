import { Colors } from '@whylabs/observatory-lib';
import WhyDogIdle from 'components/animated-components/whydog/WhyDogIdle';
import DogDialogQuestionMark from 'components/animated-components/whydog/whydog-dialog/DogDialogQuestionMark';
import { AttentionPageWrap } from 'pages/atention-page/AttentionPageWrap';
import { useResourceText } from 'pages/model-page/hooks/useResourceText';
import { createStyles } from '@mantine/core';
import { WhyLabsText } from 'components/design-system';
import { useSetHtmlTitle } from 'hooks/useSetHtmlTitle';

const getFileTexts = ({ lightCodeClass }: { lightCodeClass: string }) => ({
  DATA: {
    title: 'No dataset output columns to show',
    subtitle: (
      <>
        Any column with names that contain the word <span className={lightCodeClass}>output</span> will appear in this
        tab.
      </>
    ),
    message: 'Example column naming conventions include:',
  },
  MODEL: {
    title: 'No model output features to show',
    subtitle: (
      <>
        Any features with names that contain the word <span className={lightCodeClass}>output</span> will appear in this
        tab.
      </>
    ),
    message: 'Example feature naming conventions include:',
  },
  LLM: {
    title: 'No model metrics to show',
    subtitle: (
      <>
        Any features with names that contain the word <span className={lightCodeClass}>output</span> will appear in this
        tab.
      </>
    ),
    message: 'Example metric naming conventions include:',
  },
});

const useStyles = createStyles({
  title: {
    fontFamily: "'Baloo 2'",
    fontSize: 42,
    lineHeight: '56px',
    color: Colors.black,
    marginRight: '38px',
    marginBottom: '10px',
  },
  lightCode: {
    backgroundColor: Colors.brandSecondary100,
    color: Colors.chartOrange,
    fontFamily: 'Monaco',
    fontSize: '20px',
    lineHeight: '15px',
    padding: '5px 8px',
  },
  list: {
    padding: '7px 0',
  },
});

export function NoOutputDataPage(): JSX.Element {
  const { classes: styles } = useStyles();
  const { resourceTexts } = useResourceText(getFileTexts({ lightCodeClass: styles.lightCode }));
  useSetHtmlTitle('Outputs');

  return (
    <AttentionPageWrap
      title={<WhyLabsText className={styles.title}>{resourceTexts.title}</WhyLabsText>}
      subtitle={resourceTexts.subtitle}
      dog={<WhyDogIdle dialog={<DogDialogQuestionMark />} />}
    >
      {resourceTexts.message}
      <ul>
        <li className={styles.list}>
          <span className={styles.lightCode}>output</span>
        </li>
        <li className={styles.list}>
          <span className={styles.lightCode}>output_confidence</span>
        </li>
        <li className={styles.list}>
          <span className={styles.lightCode}>prediction (output)</span>
        </li>
      </ul>
    </AttentionPageWrap>
  );
}
