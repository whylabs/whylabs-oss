import { createStyles, getStylesRef, keyframes } from '@mantine/core';
import { Colors } from '@whylabs/observatory-lib';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNavLinkHandler } from 'hooks/usePageLinkHandler';

export const dialogAppears = keyframes({
  '100%': { opacity: 1, transform: 'translateY(0)' },
});

const useStyles = createStyles({
  dialogRoot: {
    pointerEvents: 'initial',
    opacity: 0,
    transform: 'translateY(30px)',
    animation: `${dialogAppears} 1000ms ease-in-out forwards`,
    '& g': {
      cursor: 'pointer',
    },
    [`& g:hover .${getStylesRef('goBackSymbol')}`]: {
      fill: Colors.brandRed3,
    },
  },
  goBackSymbol: {
    ref: getStylesRef('goBackSymbol'),
    transition: 'fill 200ms',
  },
});

export default function DogDialogGoBack(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { classes: styles } = useStyles();
  const { handleNavigation } = useNavLinkHandler();

  const handleGoBack = () => {
    if (location.state) {
      navigate(-1);
    } else {
      handleNavigation({ page: 'home' });
    }
  };

  return (
    <svg className={styles.dialogRoot} width="64" height="67" viewBox="0 0 64 67" fill="none">
      <g opacity="0.63" onClick={handleGoBack}>
        <circle cx="32" cy="32" r="32" fill="#f1f1f1" id="circle824" />
        <path d="M 4,67 V 42 l 19,18.1818 z" fill="#f1f1f1" id="path828" />
        <path
          className={styles.goBackSymbol}
          d="m 36.6471,45.3503 c 0.1884,0.7533 0.2825,1.6949 0.2825,2.8249 0,1.0828 -0.0941,2.0244 -0.2825,2.8248 h -5.6496 c -0.1883,-0.8004 -0.2825,-1.742 -0.2825,-2.8248 0,-1.13 0.0942,-2.0716 0.2825,-2.8249 h -3.531 C 27.2781,44.55 27.184,43.6084 27.184,42.5255 c 0,-1.1299 0.0941,-2.0715 0.2825,-2.8248 h -3.5311 c -0.1883,-0.8004 -0.2825,-1.742 -0.2825,-2.8248 0,-1.13 0.0942,-2.0716 0.2825,-2.8249 h -3.531 c -0.1883,-0.8003 -0.2825,-1.7419 -0.2825,-2.8248 0,-1.1299 0.0942,-2.0715 0.2825,-2.8248 h 3.531 c -0.1883,-0.8004 -0.2825,-1.742 -0.2825,-2.8248 0,-1.13 0.0942,-2.0716 0.2825,-2.8249 h 3.5311 c -0.1884,-0.8003 -0.2825,-1.742 -0.2825,-2.8248 0,-1.1299 0.0941,-2.0715 0.2825,-2.8248 h 3.531 c -0.1883,-0.8004 -0.2825,-1.742 -0.2825,-2.8249 0,-1.1299 0.0942,-2.0715 0.2825,-2.8248 h 5.6496 c 0.1884,0.7533 0.2825,1.6949 0.2825,2.8248 0,1.0829 -0.0941,2.0245 -0.2825,2.8249 h -3.531 c 0.1883,0.7533 0.2825,1.6949 0.2825,2.8248 0,1.0828 -0.0942,2.0245 -0.2825,2.8248 h -3.531 c 0.1883,0.7533 0.2825,1.6949 0.2825,2.8249 0,1.0828 -0.0942,2.0244 -0.2825,2.8248 H 26.054 c 0.1884,0.7533 0.2825,1.6949 0.2825,2.8248 0,1.0829 -0.0941,2.0245 -0.2825,2.8248 h 3.5311 c 0.1883,0.7533 0.2825,1.6949 0.2825,2.8249 0,1.0828 -0.0942,2.0244 -0.2825,2.8248 h 3.531 c 0.1883,0.7533 0.2825,1.6949 0.2825,2.8248 0,1.0829 -0.0942,2.0245 -0.2825,2.8248 z"
          fill="#44c0e7"
        />
      </g>
    </svg>
  );
}
