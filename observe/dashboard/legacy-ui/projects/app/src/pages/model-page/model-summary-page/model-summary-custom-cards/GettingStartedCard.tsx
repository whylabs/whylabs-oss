import { Link } from 'react-router-dom';
import { createStyles, keyframes } from '@mantine/core';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';
import { usePageTypeWithParams } from 'pages/page-types/usePageType';
import externalLinks from 'constants/externalLinks';
import Dog3Body from 'ui/Dog3-flying_body.png';
import Dog3Flames from 'ui/Dog3-flying_jet-flame.png';
import { WhyLabsText } from 'components/design-system';
import SummaryCard, { CustomCardProps, SummaryCardFooterProps } from '../SummaryCard';
import { useSummaryCardStyles } from '../useModelSummaryCSS';

const animDuration = 3500;

const levitationBody = keyframes({
  '0%': { transform: `translate(-50%, 0)` },
  '40%': { transform: `translate(-50%, -5px)` },
  '100%': { transform: `translate(-50%, 0)` },
});

const levitationFlame = keyframes({
  '0%': { transform: `translateX(2px) scale(0.95)` },
  '40%': { transform: `translateX(-1px) scale(1.02)` },
  '100%': { transform: `translateX(2px) scale(0.95)` },
});

const useLocalStyles = createStyles({
  dogWrap: {
    position: 'relative',
    marginTop: 26,
    height: 220,
    width: '100%',
  },
  dogImg: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '100%',
    left: '50%',
    transform: `translate(-50%, 0)`,
    animation: `${levitationBody} ${animDuration}ms 600ms ease-in-out infinite`,
  },
  dogImgBody: {
    backgroundImage: `url(${Dog3Body})`,
  },
  dogImgFlames: {
    backgroundImage: `url(${Dog3Flames})`,
    animation: `${levitationFlame} ${animDuration}ms ease-in-out infinite`,
  },
  dogImgPart: {
    minHeight: '100%',
    backgroundPosition: 'center',
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
});

const GettingStartedCard = ({ customCard }: { customCard: CustomCardProps }): JSX.Element => {
  const { classes: styles, cx } = useSummaryCardStyles();
  const { classes: localStyles } = useLocalStyles();
  const { modelId } = usePageTypeWithParams();
  const { getNavUrl } = useNavLinkHandler();

  const footer: SummaryCardFooterProps = {
    footerLinkNewTab: true,
    footerLink: externalLinks.youtubeObservabilityPlatform,
    footerTxt: 'Watch the video',
    footerIcon: true,
  };

  return (
    <SummaryCard customCard={customCard} infoCard footer={footer}>
      <WhyLabsText inherit className={styles.contentTxt}>
        In a few simple steps you will be running AI with certainty!
      </WhyLabsText>
      <ol className={styles.contentList}>
        <li>
          <WhyLabsText inherit className={styles.contentTxt}>
            Go to the{' '}
            <Link className={styles.cardLink} to={getNavUrl({ page: 'monitorManager', modelId })}>
              monitor settings page
            </Link>{' '}
            page
          </WhyLabsText>
        </li>
        <li>
          <WhyLabsText inherit className={styles.contentTxt}>
            Enable a monitor preset
          </WhyLabsText>
        </li>
        <li>
          <WhyLabsText inherit className={styles.contentTxt}>
            Or, configure a custom monitor
          </WhyLabsText>
        </li>
        <li>
          <WhyLabsText inherit className={styles.contentTxt}>
            Visit the{' '}
            <Link className={styles.cardLink} to={getNavUrl({ page: 'settings', settings: { path: 'notifications' } })}>
              notifications page
            </Link>{' '}
            to set up Slack and email alerts
          </WhyLabsText>
        </li>
      </ol>
      <WhyLabsText inherit className={styles.contentTxt}>
        And that’s it! No other setup is needed, but you can manually configure all the monitors if you want to.
      </WhyLabsText>
      <div className={cx(localStyles.dogWrap, styles.imgWrap)}>
        <div className={localStyles.dogImg}>
          <div className={cx(localStyles.dogImgPart, localStyles.dogImgFlames)} />
          <div className={cx(localStyles.dogImgPart, localStyles.dogImgBody)} />
        </div>
      </div>
    </SummaryCard>
  );
};
export default GettingStartedCard;
