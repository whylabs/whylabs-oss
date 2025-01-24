import { createStyles } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { Colors } from '~/assets/Colors';
import { useUserContext } from '~/hooks/useUserContext';
import { useWhyLabsSnackbar } from '~/hooks/useWhyLabsSnackbar';
import { trpc } from '~/utils/trpc';
import { FeedbackCategory } from '~server/graphql/generated/graphql';
import LogRocket from 'logrocket';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  WhyLabsButton,
  WhyLabsMultiSelect,
  WhyLabsRadioGroup,
  WhyLabsSubmitButton,
  WhyLabsText,
  WhyLabsTextArea,
} from '../design-system';
import ExternalLink from '../link/ExternalLink';
import { FeedbackInfo } from './feedbackFormTypes';

const useStyles = createStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  title: {
    color: Colors.secondaryLight1000,
    fontFamily: 'Asap',
    fontStyle: 'normal',
    fontWeight: 600,
    fontSize: '16px',
    lineHeight: '24px',
  },
  text: {
    fontFamily: 'Asap',
    fontStyle: 'normal',
    fontWeight: 'normal',
    fontSize: '14px',
    lineHeight: '24px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '250px',
  },
  footerText: {
    fontFamily: 'Asap',
    fontStyle: 'normal',
    fontWeight: 'normal',
    fontSize: '12px',
    lineHeight: '20px',
  },
  textAreaCharCount: {
    textAlign: 'right',
    fontFamily: 'Asap',
    fontStyle: 'normal',
    fontWeight: 'normal',
    fontSize: '12px',
    lineHeight: '20px',
    color: Colors.brandSecondary600,
  },
  footer: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  },
  footerControls: {
    display: 'flex',
    gap: 8,
  },
  textAreaBottomText: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  errorText: {
    alignItems: 'center',
    color: Colors.red,
    display: 'flex',
    fontFamily: 'Asap',
    fontSize: '12px',
    fontWeight: 'normal',
    gap: 4,
    lineHeight: '20px',
  },
  informationalMessageContainer: {
    padding: '10px',
    display: 'flex',
    justifyContent: 'center',
    border: `1px solid ${Colors.chartBlue}`,
    background: Colors.brandSecondary100,
    marginBottom: '5px',
  },
  informationalMessage: {
    fontFamily: 'Asap',
    fontWeight: 'normal',
    fontSize: '12px',
    lineHeight: '20px',
  },
  informationalMessageLink: {
    color: Colors.linkColor,
  },
});

type TagOption = {
  label: string;
  value: string;
};

const options: TagOption[] = [
  {
    label: 'Chart functionality',
    value: 'ChartFunctionality',
  },
  {
    label: 'Content',
    value: 'Content',
  },
  {
    label: 'Data accuracy',
    value: 'DataAccuracy',
  },
  {
    label: 'Monitor',
    value: 'Monitor',
  },
  {
    label: 'Usability',
    value: 'Usability',
  },
  {
    label: 'Visual',
    value: 'Visual',
  },
];

const TEXT_AREA_CHAR_LIMIT = 500;
const FEEDBACK_SENT_SUCCESSFULLY = 'Feedback submitted successfully';
const FEEDBACK_SENT_UNSUCCESSFULLY = 'Feedback submission failed';

type FeedbackFormProps = {
  feedbackInfo: FeedbackInfo | null;
  onClose: () => void;
};

export const FeedbackForm = ({ feedbackInfo, onClose }: FeedbackFormProps) => {
  const { classes } = useStyles();
  const { orgId, resourceId } = useParams();
  const { currentUser: user } = useUserContext();
  const { enqueueSnackbar } = useWhyLabsSnackbar();

  const mutation = trpc.meta.general.sendFeedback.useMutation();
  const { isLoading: isSaving } = mutation;

  const [categoryValue, setCategoryValue] = useState<FeedbackCategory | ''>('');
  const [tags, setTags] = useState<string[]>([]);
  const [textAreaValue, setTextAreaValue] = useState('');
  const [categoryError, setCategoryError] = useState(false);
  const [tagsError, setTagsError] = useState(false);
  const [textAreaError, setTextAreaError] = useState(false);

  const handleSendFeedback = () => {
    const hasError = checkForErrors();
    if (hasError) return;

    if (!orgId) return;
    if (!feedbackInfo) return;
    if (!categoryValue) return;
    if (tags.length < 1) return;
    if (!textAreaValue) return;

    const trackID = `${user?.whyLabsId ?? 'unknown'}--${new Date().getTime()}`;
    const feedback = {
      tags,
      category: categoryValue,
      component: feedbackInfo.componentName,
      message: textAreaValue,
      featureName: feedbackInfo.featureId,
      datasetId: resourceId,
      url: window.location.href,
      trackID,
    };
    LogRocket.track('user-feedback', { [trackID]: JSON.stringify(feedback) });

    mutation
      .mutateAsync({
        ...feedback,
        submitAnonymously: false,
        orgId,
        resourceId,
      })
      .then(() => {
        enqueueSnackbar({
          title: FEEDBACK_SENT_SUCCESSFULLY,
        });
        onClose();
      })
      .catch((error) => {
        LogRocket.error(`Error sending feedback form: ${error}`);
        enqueueSnackbar({
          variant: 'error',
          title: FEEDBACK_SENT_UNSUCCESSFULLY,
        });
      });
  };

  function checkForErrors() {
    let hasError = false;

    if (tags.length < 1) {
      setTagsError(true);
      hasError = true;
    }
    if (!categoryValue) {
      setCategoryError(true);
      hasError = true;
    }
    if (textAreaValue.length < 1) {
      setTextAreaError(true);
      hasError = true;
    }

    return hasError;
  }

  function generateUrgentMessage() {
    if (user === undefined) return null;

    return (
      <div className={classes.informationalMessageContainer}>
        <WhyLabsText className={classes.informationalMessage}>
          For urgent issues and requests, please create an issue in our{' '}
          <ExternalLink className={classes.informationalMessageLink} to="support">
            Support Portal
          </ExternalLink>
        </WhyLabsText>
      </div>
    );
  }

  if (!feedbackInfo) return null;

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <WhyLabsText className={classes.title}>Send feedback</WhyLabsText>
        <WhyLabsText className={classes.text}>{feedbackInfo.componentName}</WhyLabsText>
      </div>
      <div>
        <WhyLabsRadioGroup
          label="Category"
          onChange={(value) => {
            setCategoryValue(value as FeedbackCategory);
            if (categoryError && value) setCategoryError(false); // Removes error message
          }}
          options={[
            { label: 'Issue or bug', value: FeedbackCategory.Bug },
            { label: 'Feature request', value: FeedbackCategory.Request },
            { label: 'General suggestion', value: FeedbackCategory.General },
          ]}
          orientation="column"
          spacing="xs"
          value={categoryValue}
        />
        {categoryError && renderErrorMessage('Category is required')}
      </div>
      <div>
        <WhyLabsMultiSelect
          error={tagsError}
          id="tags-outlined"
          data={options}
          label="Tags"
          onChange={(selectedTags) => {
            setTags(selectedTags);
            if (tagsError && selectedTags.length > 0) setTagsError(false);
          }}
          placeholder={tags.length >= 1 ? '' : 'Select at least one tag'}
        />
        {tagsError && renderErrorMessage('You must add at least one tag')}
      </div>
      <div>
        <WhyLabsTextArea
          error={textAreaError}
          label="Help us understand your feedback"
          onChange={(newVal) => {
            const charLimit = newVal.length <= TEXT_AREA_CHAR_LIMIT;
            if (charLimit) setTextAreaValue(newVal);
            if (textAreaValue && newVal.length > 0) setTextAreaError(false); // Removes error message
          }}
          maxRows={4}
          value={textAreaValue}
        />
        <WhyLabsText className={classes.textAreaBottomText}>
          {textAreaError && renderErrorMessage('Feedback text is required')}
          <span className={classes.textAreaCharCount}>
            {TEXT_AREA_CHAR_LIMIT - textAreaValue.length} characters remaining
          </span>
        </WhyLabsText>
      </div>
      {generateUrgentMessage()}
      <div className={classes.footer}>
        <WhyLabsText className={classes.footerText}>Your email address will be included with the feedback</WhyLabsText>
        <div className={classes.footerControls}>
          <WhyLabsButton color="gray" disabled={isSaving} onClick={onClose} variant="outline">
            Cancel
          </WhyLabsButton>
          <WhyLabsSubmitButton loading={isSaving} onClick={handleSendFeedback}>
            Send
          </WhyLabsSubmitButton>
        </div>
      </div>
    </div>
  );

  function renderErrorMessage(message: string) {
    return (
      <span className={classes.errorText}>
        <IconAlertTriangle size={14} />
        {message}
      </span>
    );
  }
};
