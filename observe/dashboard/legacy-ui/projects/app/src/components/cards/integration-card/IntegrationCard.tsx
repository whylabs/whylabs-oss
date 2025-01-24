import { WhyLabsLinkButton } from 'components/design-system';
import { useIntegrationsLibraryStyles } from 'pages/settings-pages/integration-settings/integration-tabs/IntegrationsLibrary';
import { useIntegrationSettingsStyles } from 'pages/settings-pages/integration-settings/IntegrationPageCSS';
import backgroundCard from 'pages/settings-pages/integration-settings/assets/backgroundImageIntegrationsCard.svg';
import { IntegrationCardType } from './integrationCardTypes';

type IntegrationCardProps = {
  integrationItem: IntegrationCardType;
};

export const IntegrationCard: React.FC<IntegrationCardProps> = ({ integrationItem }) => {
  const { cx } = useIntegrationSettingsStyles();
  const { classes: localStyles } = useIntegrationsLibraryStyles();

  return (
    <div className={cx(localStyles.integrationCard, integrationItem.coming_soon && localStyles.comingSoonCard)}>
      {!integrationItem.coming_soon && (
        <img alt="background" src={backgroundCard} className={localStyles.backgroundCardImg} />
      )}
      <h4>{integrationItem.title}</h4>
      <div className={cx('integration-library--logo')}>
        <img alt={`${integrationItem.title} logo`} src={integrationItem.logo} />
      </div>
      <p>{integrationItem.description}</p>
      {integrationItem.coming_soon && <div className="integration-library--soon-tag">COMING SOON!</div>}
      {!integrationItem.coming_soon && (
        <div className={localStyles.integrationCtaWrapper}>
          <WhyLabsLinkButton
            href={integrationItem.url ?? '#'}
            target="_blank"
            width="full"
            variant="outline"
            color="gray"
          >
            Details
          </WhyLabsLinkButton>
        </div>
      )}
    </div>
  );
};
