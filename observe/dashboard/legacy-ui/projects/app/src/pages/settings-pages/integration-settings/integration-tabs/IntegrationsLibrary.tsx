import { createStyles } from '@mantine/core';
import { Colors, SafeLink } from '@whylabs/observatory-lib';
import { useMemo, useState } from 'react';
import WhyLabsLinkButton from 'components/design-system/button/WhyLabsLinkButton';
import { WhyLabsLoadingOverlay, WhyLabsText } from 'components/design-system';
import { useGetIntegrationCardsQuery } from 'generated/graphql';
import { IntegrationCardType } from 'components/cards/integration-card/integrationCardTypes';
import { useIntegrationSettingsStyles } from '../IntegrationPageCSS';
import backgroundCard from '../assets/backgroundImageIntegrationsCard.svg';

export const useIntegrationsLibraryStyles = createStyles(() => ({
  mainContainer: {
    padding: '0 50px',
  },
  categoryDescription: {
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
    textTransform: 'capitalize',
  },
  selectedCategory: {
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
    position: 'relative',
    minHeight: '300px',
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
  integrationCardTitle: {
    margin: '0 0 4px 0',
    fontFamily: 'Asap',
    fontSize: '18px',
    letterSpacing: '0.1px',
    lineHeight: 1.8,
    fontWeight: 600,
    color: Colors.secondaryLight1000,
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

export const IntegrationsLibrary: React.FC = () => {
  const { classes, cx } = useIntegrationSettingsStyles();
  const { classes: localStyles } = useIntegrationsLibraryStyles();
  const [selectedCategory, setSelectedCategory] = useState('');

  const { data: integrationCardsQueryData, loading: isLoading } = useGetIntegrationCardsQuery();

  const unslugify = (input: string): string => {
    const text = input.replaceAll('-', ' ').replaceAll(' ai', ' AI').replaceAll(' ml', ' ML');

    return text;
  };

  const [integrationCards, uniqueCategories]: [IntegrationCardType[], string[]] = useMemo(() => {
    const cards =
      integrationCardsQueryData?.integrationCards?.flatMap((integrationCard) => {
        if (!integrationCard) return [];

        return [
          {
            coming_soon: integrationCard.coming_soon || false,
            description: integrationCard.description || '',
            logo: integrationCard.logo || '',
            title: integrationCard.title || '',
            url: integrationCard.url || '',
            category: integrationCard.category || '',
          },
        ];
      }) ?? [];

    const categories = cards
      .map((integrationCard) => unslugify(integrationCard.category))
      .filter((value, index, currentValue) => currentValue.indexOf(value) === index);

    return [cards, categories];
  }, [integrationCardsQueryData]);

  const usedSelectedCategory = selectedCategory || uniqueCategories[0];

  return (
    <div className={classes.tabRoot}>
      <main className={localStyles.mainContainer}>
        <p className={localStyles.categoryDescription}>
          Additional examples that cover advanced use cases and other functionality can be found in the{' '}
          <SafeLink href="https://github.com/whylabs/whylogs/tree/mainline/python/examples">
            whylogs Github repo
          </SafeLink>{' '}
          Have fun!
        </p>
        <section className={localStyles.section}>
          <aside className={localStyles.cardsWrapper}>
            {uniqueCategories.map((category) => (
              <button
                type="button"
                key={`integration--section-${category}`}
                className={cx(localStyles.card, { [localStyles.selectedCategory]: usedSelectedCategory === category })}
                onClick={() => setSelectedCategory(category)}
              >
                <p className={localStyles.cardTitle}>{unslugify(category)}</p>
              </button>
            ))}
          </aside>
          <article className={localStyles.integrationsContainer}>
            <WhyLabsLoadingOverlay visible={!!isLoading} />
            {integrationCards
              .filter((card) => unslugify(card.category) === usedSelectedCategory)
              .map((card) => (
                <div
                  key={`integration--${card.title}`}
                  className={cx(localStyles.integrationCard, { [localStyles.comingSoonCard]: card.coming_soon })}
                >
                  {!card.coming_soon && (
                    <img alt="background" src={backgroundCard} className={localStyles.backgroundCardImg} />
                  )}
                  <WhyLabsText className={localStyles.integrationCardTitle}>{card.title}</WhyLabsText>
                  <div className={cx('integration-library--logo')}>
                    <img alt={`${card.title} logo`} src={card.logo} />
                  </div>
                  <p>{card.description}</p>
                  {card.coming_soon && <div className="integration-library--soon-tag">COMING SOON!</div>}
                  {!card.coming_soon && (
                    <div className={localStyles.integrationCtaWrapper}>
                      <WhyLabsLinkButton
                        href={card.url ?? '#'}
                        target="_blank"
                        width="full"
                        variant="filled"
                        color="gray"
                      >
                        {card.url.includes('contact-us') ? 'Contact Us' : 'Details'}
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
