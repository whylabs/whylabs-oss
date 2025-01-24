import { createStyles, keyframes } from '@mantine/core';

const numOfBracketPairs = 3;
const bracketArrayForMapping = Array(numOfBracketPairs).fill(0);
const expandingDuration = 3000;
const delayStepDuration = Math.round(expandingDuration / numOfBracketPairs);

const nthBracketAnimationDelayed: { [key: string]: { [key: string]: string } } = {};
for (let i = 0; i < numOfBracketPairs; i += 1) {
  const animationDelayObj = { animationDelay: `${i * delayStepDuration}ms` };
  nthBracketAnimationDelayed[`&:nth-child(${i + 1})`] = animationDelayObj;
}
const leftBracketRotation = 'rotate(180deg)';
const brackedTranslation = 55;

const dialogAppears = keyframes({
  '100%': { opacity: 1, transform: 'translateY(0)' },
});

const bracketLeftExpanding = keyframes({
  '0%': { opacity: 0, transform: `${leftBracketRotation} translateX(0px) scale(0.5)` },
  '100%': { opacity: 1, transform: `${leftBracketRotation} translateX(${brackedTranslation}px) scale(1.5)` },
});

const bracketRightExpanding = keyframes({
  '0%': { opacity: 0, transform: 'translateX(0px) scale(0.5)' },
  '100%': { opacity: 1, transform: `translateX(${brackedTranslation}px) scale(1.5)` },
});

const useStyles = createStyles({
  dialogRoot: {
    opacity: 0,
    transform: 'translateY(30px)',
    animation: `${dialogAppears} 1000ms ease-in-out forwards`,
  },
  expandBracketLeft: {
    opacity: 0,
    transform: leftBracketRotation,
    animation: `${bracketLeftExpanding} ${expandingDuration}ms linear infinite`,
    ...nthBracketAnimationDelayed,
  },
  expandBracketRight: {
    opacity: 0,
    animation: `${bracketRightExpanding} ${expandingDuration}ms linear infinite`,
    ...nthBracketAnimationDelayed,
  },
});

const maskId = 'expand-dialog-mask';

export default function DogDialogUnsupportedDevice(): JSX.Element {
  const { classes: styles } = useStyles();

  return (
    <svg className={styles.dialogRoot} width="64" height="67" viewBox="0 0 60 67" fill="none">
      <mask id={maskId}>
        <rect className="test-item" x="0" y="0" width="100" height="100" fill="#000" />
        <g transform="translate(-56.923203,5.3600003)">
          <circle cx="88.923203" cy="26.639999" r="32" fill="#fff" />
          <path d="m 60.9232,61.64 v -25 l 19,18.1818 z" fill="#fff" />
        </g>
      </mask>
      <g opacity="0.63">
        <circle cx="32" cy="32" r="32" fill="#f1f1f1" id="circle824" />
        <path d="M 4,67 V 42 l 19,18.1818 z" fill="#f1f1f1" id="path826" />
      </g>
      <g mask={`url(#${maskId})`}>
        <g>
          {bracketArrayForMapping.map((_, i) => (
            <path
              // eslint-disable-next-line react/no-array-index-key
              key={`expand-bracket-left-${i}`}
              transform-origin="32 31.440001"
              className={styles.expandBracketLeft}
              d="m 26.48,21.84 c -0.128,-0.512 -0.192,-1.152 -0.192,-1.92 0,-0.736 0.064,-1.376 0.192,-1.92 h 3.84 c 0.128,0.544 0.192,1.184 0.192,1.92 0,0.768 -0.064,1.408 -0.192,1.92 h 2.4 c 0.128,0.544 0.192,1.184 0.192,1.92 0,0.768 -0.064,1.408 -0.192,1.92 h 2.4 c 0.128,0.544 0.192,1.184 0.192,1.92 0,0.768 -0.064,1.408 -0.192,1.92 h 2.4 c 0.128,0.544 0.192,1.184 0.192,1.92 0,0.768 -0.064,1.408 -0.192,1.92 h -2.4 c 0.128,0.544 0.192,1.184 0.192,1.92 0,0.768 -0.064,1.408 -0.192,1.92 h -2.4 c 0.128,0.544 0.192,1.184 0.192,1.92 0,0.768 -0.064,1.408 -0.192,1.92 h -2.4 c 0.128,0.544 0.192,1.184 0.192,1.92 0,0.768 -0.064,1.408 -0.192,1.92 h -3.84 c -0.128,-0.512 -0.192,-1.152 -0.192,-1.92 0,-0.736 0.064,-1.376 0.192,-1.92 h 2.4 c -0.128,-0.512 -0.192,-1.152 -0.192,-1.92 0,-0.736 0.064,-1.376 0.192,-1.92 h 2.4 c -0.128,-0.512 -0.192,-1.152 -0.192,-1.92 0,-0.736 0.064,-1.376 0.192,-1.92 h 2.4 c -0.128,-0.512 -0.192,-1.152 -0.192,-1.92 0,-0.736 0.064,-1.376 0.192,-1.92 h -2.4 c -0.128,-0.512 -0.192,-1.152 -0.192,-1.92 0,-0.736 0.064,-1.376 0.192,-1.92 h -2.4 c -0.128,-0.512 -0.192,-1.152 -0.192,-1.92 0,-0.736 0.064,-1.376 0.192,-1.92 z"
              fill="#f5843c"
            />
          ))}
        </g>
        <g>
          {bracketArrayForMapping.map((_, i) => (
            <path
              // eslint-disable-next-line react/no-array-index-key
              key={`expand-bracket-right-${i}`}
              transform-origin="32 31.440001"
              className={styles.expandBracketRight}
              d="m 26.48,21.84 c -0.128,-0.512 -0.192,-1.152 -0.192,-1.92 0,-0.736 0.064,-1.376 0.192,-1.92 h 3.84 c 0.128,0.544 0.192,1.184 0.192,1.92 0,0.768 -0.064,1.408 -0.192,1.92 h 2.4 c 0.128,0.544 0.192,1.184 0.192,1.92 0,0.768 -0.064,1.408 -0.192,1.92 h 2.4 c 0.128,0.544 0.192,1.184 0.192,1.92 0,0.768 -0.064,1.408 -0.192,1.92 h 2.4 c 0.128,0.544 0.192,1.184 0.192,1.92 0,0.768 -0.064,1.408 -0.192,1.92 h -2.4 c 0.128,0.544 0.192,1.184 0.192,1.92 0,0.768 -0.064,1.408 -0.192,1.92 h -2.4 c 0.128,0.544 0.192,1.184 0.192,1.92 0,0.768 -0.064,1.408 -0.192,1.92 h -2.4 c 0.128,0.544 0.192,1.184 0.192,1.92 0,0.768 -0.064,1.408 -0.192,1.92 h -3.84 c -0.128,-0.512 -0.192,-1.152 -0.192,-1.92 0,-0.736 0.064,-1.376 0.192,-1.92 h 2.4 c -0.128,-0.512 -0.192,-1.152 -0.192,-1.92 0,-0.736 0.064,-1.376 0.192,-1.92 h 2.4 c -0.128,-0.512 -0.192,-1.152 -0.192,-1.92 0,-0.736 0.064,-1.376 0.192,-1.92 h 2.4 c -0.128,-0.512 -0.192,-1.152 -0.192,-1.92 0,-0.736 0.064,-1.376 0.192,-1.92 h -2.4 c -0.128,-0.512 -0.192,-1.152 -0.192,-1.92 0,-0.736 0.064,-1.376 0.192,-1.92 h -2.4 c -0.128,-0.512 -0.192,-1.152 -0.192,-1.92 0,-0.736 0.064,-1.376 0.192,-1.92 z"
              fill="#f5843c"
            />
          ))}
        </g>
      </g>
    </svg>
  );
}
