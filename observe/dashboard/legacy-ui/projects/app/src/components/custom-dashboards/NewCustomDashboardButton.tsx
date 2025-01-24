import { TARGET_ORG_QUERY_NAME } from 'graphql/apollo';
import { getNewStackEmbeddedURL } from 'hooks/useNewStackLinkHandler';
import { getParam } from 'pages/page-types/usePageType';
import { USED_ON_KEY } from 'types/navTags';
import { useSuperGlobalDateRange } from '../super-date-picker/hooks/useSuperGlobalDateRange';
import { WhyLabsSubmitButton, WhyLabsTooltip } from '../design-system';

type NewCustomDashboardButtonProps = {
  disabledWithMessage?: string | null;
  usedOn: string;
};

export const NewCustomDashboardButton = ({
  disabledWithMessage,
  usedOn,
}: NewCustomDashboardButtonProps): JSX.Element => {
  const { datePickerSearchString } = useSuperGlobalDateRange();
  const orgId = getParam(TARGET_ORG_QUERY_NAME);

  if (!orgId) return <></>;

  const isDisabled = !!disabledWithMessage;

  const buttonElement = (
    <WhyLabsSubmitButton disabled={isDisabled} type="button">
      New dashboard
    </WhyLabsSubmitButton>
  );
  if (isDisabled) return <WhyLabsTooltip label={disabledWithMessage}>{buttonElement}</WhyLabsTooltip>;

  const link = (() => {
    const newStackSearchParams = new URLSearchParams();
    newStackSearchParams.set(USED_ON_KEY, usedOn);

    return getNewStackEmbeddedURL({
      orgId,
      path: 'dashboards/create',
      searchParams: newStackSearchParams,
      datePickerSearchString,
    });
  })();

  return <a href={link}>{buttonElement}</a>;
};
