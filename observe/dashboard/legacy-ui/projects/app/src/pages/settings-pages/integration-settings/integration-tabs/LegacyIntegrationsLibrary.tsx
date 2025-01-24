import { createStyles } from '@mantine/core';
import { Colors, SafeLink } from '@whylabs/observatory-lib';
import { useState } from 'react';
import WhyLabsLinkButton from 'components/design-system/button/WhyLabsLinkButton';
import { useIntegrationSettingsStyles } from '../IntegrationPageCSS';
import backgroundCard from '../assets/backgroundImageIntegrationsCard.svg';
import { integrationsLibrary } from './IntegrationsUtils';

export const useIntegrationsLibraryStyles = createStyles(() => ({
  mainContainer: {
    padding: '0 50px',
  },
  sectionDescription: {
    margin: '12px 0 20px 0',
    fontSize: '16px',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  section: {
    paddingBottom: '12px',
    display: 'flex',
  },
  cardsWrapper: {
    width: '250px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    boxSizing: 'border-box',
  },
  card: {
    width: '250px',
    textAlign: 'start',
    border: 0,
    backgroundColor: 'white',
    padding: '10px 15px',
    borderRadius: '4px',
    '&:hover': {
      outline: `1px solid ${Colors.brandSecondary200}`,
    },
  },
  cardTitle: {
    margin: 0,
    fontWeight: 600,
    fontSize: '16px',
    lineHeight: 1.5,
  },
  selectedSection: {
    backgroundColor: `${Colors.brandSecondary100} !important`,
    outline: `1px solid ${Colors.brandSecondary200}`,
    boxShadow: '0px 3px 10px rgba(0, 0, 0, 0.1)',
  },
  integrationsContainer: {
    marginLeft: '12px',
    width: '100%',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '15px',
    boxSizing: 'border-box',
    padding: '0px 20px',
    height: 'fit-content',
  },
  integrationCard: {
    width: '245px',
    // minHeight: '300px',
    // maxHeight: '380px',
    background: 'linear-gradient(151.53deg, rgb(255, 255, 255) 60%, rgb(232, 235, 235) 80%)',
    borderRadius: '4px',
    padding: '15px',
    boxShadow: 'rgba(0, 0, 0, 13%) 0px 0px 5px',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    ':-webkit-box-pack': 'justify',
    justifyContent: 'space-between',
    zIndex: 10,
    '& h4': {
      margin: '0 0 4px 0',
      fontFamily: 'Asap',
      fontSize: '21px',
      letterSpacing: '0.1px',
      lineHeight: 1.8,
      fontWeight: 600,
      color: Colors.secondaryLight1000,
    },
    '& p': {
      fontWeight: 300,
      letterSpacing: '0.1px',
      lineHeight: 1.3,
      fontSize: '14px',
      margin: 0,
      height: '100%',
      color: 'rgba(0, 43, 67, 0.75)',
    },
    '& .integration-library--logo': {
      height: '100px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      margin: '1rem 0',
      '& img': {
        height: '100px',
        width: '100%',
        objectFit: 'scale-down',
      },
    },
  },
  comingSoonCard: {
    overflow: 'hidden',
    minHeight: '220px',
    maxHeight: '220px',
    background: 'white',
    '& h4, & p': {
      color: `${Colors.brandSecondary600}`,
    },
    '& .integration-library--logo': {
      minHeight: '50px',
      height: '100%',
      maxHeight: '70px',
    },
    '& .integration-library--soon-tag': {
      width: '80%',
      textAlign: 'center',
      position: 'absolute',
      right: '-55px',
      top: '32px',
      backgroundColor: 'rgb(119, 129, 131)',
      color: 'white',
      transform: 'rotate(45deg)',
    },
  },
  backgroundCardImg: {
    position: 'absolute',
    right: 0,
  },
  integrationCtaWrapper: {
    marginTop: '16px',
  },
}));

export const LegacyIntegrationsLibrary: React.FC = () => {
  const { classes, cx } = useIntegrationSettingsStyles();
  const { classes: localStyles } = useIntegrationsLibraryStyles();
  const [selectedSection, setSelectedSection] = useState(integrationsLibrary[0]);

  return (
    <div className={classes.tabRoot}>
      <main className={localStyles.mainContainer}>
        <p className={localStyles.sectionDescription}>
          Additional examples that cover advanced use cases and other functionality can be found in the{' '}
          <SafeLink href="https://github.com/whylabs/whylogs/tree/mainline/python/examples">
            whylogs Github repo
          </SafeLink>{' '}
          Have fun!
        </p>
        <section className={localStyles.section}>
          <aside className={localStyles.cardsWrapper}>
            {integrationsLibrary.map((section) => (
              <button
                type="button"
                key={`integration--section-${section.id}`}
                className={cx(localStyles.card, selectedSection.id === section.id && localStyles.selectedSection)}
                onClick={() => setSelectedSection(section)}
              >
                <p className={localStyles.cardTitle}>{section.title}</p>
              </button>
            ))}
          </aside>
          <article className={localStyles.integrationsContainer}>
            {selectedSection?.cards?.map((card) => (
              <div
                key={`integration--${card.title}`}
                className={cx(localStyles.integrationCard, card.comingSoon && localStyles.comingSoonCard)}
              >
                {!card.comingSoon && (
                  <img alt="background" src={backgroundCard} className={localStyles.backgroundCardImg} />
                )}
                <h4>{card.title}</h4>
                <div className={cx('integration-library--logo')}>
                  <img alt={`${card.title} logo`} src={card.logo} />
                </div>
                <p>{card.description}</p>
                {card.comingSoon && <div className="integration-library--soon-tag">COMING SOON!</div>}
                {!card.comingSoon && (
                  <div className={localStyles.integrationCtaWrapper}>
                    <WhyLabsLinkButton
                      href={card.ctaUrl ?? '#'}
                      target="_blank"
                      width="full"
                      variant="outline"
                      color="gray"
                    >
                      {card.alternativeCTAText ?? 'Details'}
                    </WhyLabsLinkButton>
                  </div>
                )}
              </div>
            ))}
          </article>
        </section>
      </main>
    </div>
  );
};
