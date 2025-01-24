import { CircularProgress } from '@material-ui/core';
import { adHocAtom, useAdHoc } from 'atoms/adHocAtom';
import { Colors } from '@whylabs/observatory-lib';
import { useRecoilState } from 'recoil';
import idea from 'ui/idea.svg';
import { usePageType } from 'pages/page-types/usePageType';
import { createStyles } from '@mantine/core';
import { WhyLabsButton } from 'components/design-system';

const useStyles = createStyles({
  banner: {
    color: Colors.white,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 10px',
    minHeight: '42px',
    height: '42px',
    fontFamily: 'Asap',
    position: 'relative',
    zIndex: 1,
  },
  bannerContent: {
    display: 'flex',
    alignSelf: 'center',
  },
  bannerRight: {
    display: 'flex',
    justifyContent: 'right',
    gap: 16,
    alignItems: 'center',
  },
  bannertext: { paddingLeft: '12px', alignSelf: 'center', fontSize: '14px', textOverflow: 'ellipsis' },
  previewButton: {
    color: Colors.white,
    borderColor: Colors.white,
    fontWeight: 600,
    paddingLeft: '15px',
    paddingRight: '15px',
  },
  closeIcon: {
    padding: 0,
    marginLeft: '10px',
    color: Colors.white,
  },
});

function AdHocBanner(): JSX.Element {
  const { classes: styles } = useStyles();
  const pageType = usePageType();
  const isOutputPage = pageType === 'outputFeature' || pageType === 'segmentOutputFeature';
  const [adHocRecoilData, setAdHocRecoilData] = useRecoilState(adHocAtom);
  const [adHocRunId] = useAdHoc();

  const closeAdHocResults = () => {
    setAdHocRecoilData({
      features: [],
      model: undefined,
      segment: undefined,
      runId: undefined,
      pageType: undefined,
      loading: false,
      error: false,
    });
  };

  const bannerStyle = (() => {
    if (adHocRecoilData.loading === true) {
      return { backgroundColor: Colors.chartBlue };
    }
    if (adHocRecoilData.error === true) {
      return { backgroundColor: Colors.red };
    }
    return { backgroundColor: Colors.chartOrange };
  })();

  const bannerText = (() => {
    const featureCount = adHocRecoilData.features.length;
    const columnText = isOutputPage ? 'output' : 'feature';
    if (adHocRecoilData.error === true) {
      return `There was an error running the monitor preview`;
    }
    if (adHocRecoilData.loading === true) {
      return `Please wait while the monitor preview running on ${featureCount} ${columnText}${
        featureCount !== 1 ? 's' : ''
      } completes.`;
    }
    if (adHocRunId) {
      return `You are viewing the results of a monitor preview on ${featureCount} ${columnText}${
        featureCount !== 1 ? 's' : ''
      }.`;
    }
    return '';
  })();

  return (
    <>
      <div className={styles.banner} style={bannerStyle}>
        <div className={styles.bannerContent}>
          <img src={idea} alt="idea" width={26} height={26} />
          <div className={styles.bannertext}>
            <span>{bannerText}</span>
          </div>
        </div>
        <div className={styles.bannerRight}>
          {adHocRecoilData.loading === true && <CircularProgress size={18} />}
          <WhyLabsButton
            variant="outline"
            className={styles.previewButton}
            onClick={() => {
              closeAdHocResults();
            }}
          >
            Close
          </WhyLabsButton>
        </div>
      </div>
    </>
  );
}

export default AdHocBanner;
