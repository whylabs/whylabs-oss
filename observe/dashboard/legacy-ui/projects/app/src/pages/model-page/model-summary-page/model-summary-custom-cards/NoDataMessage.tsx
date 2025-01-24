import { Link } from 'react-router-dom';
import { WhyLabsText } from 'components/design-system';
import useTypographyStyles from 'styles/Typography';
import { useSummaryCardStyles } from '../useModelSummaryCSS';

type LinkedLine = { text: string; link: string };

interface NoDataMessageProps {
  simpleDisplayText: string;
  rangeString?: string;
  explanationLines?: (string | LinkedLine)[];
}

export function NoDataMessage({ simpleDisplayText, rangeString, explanationLines }: NoDataMessageProps): JSX.Element {
  const { classes, cx } = useSummaryCardStyles();
  const { classes: typography } = useTypographyStyles();

  function renderLinkedLine(line: LinkedLine) {
    return (
      <Link to={line.link} className={cx(typography.link, classes.cardExplanationText)} key={line.text + line.link}>
        {line.text}
      </Link>
    );
  }
  function renderString(line: string) {
    return (
      <WhyLabsText inherit className={classes.cardExplanationText} key={line}>
        {line}
      </WhyLabsText>
    );
  }
  function renderLines() {
    return (
      explanationLines?.map((line) => (typeof line === 'string' ? renderString(line) : renderLinkedLine(line))) ?? null
    );
  }

  return (
    <div className={classes.messageStack}>
      <WhyLabsText inherit className={classes.stackCardNoDataText}>
        {simpleDisplayText}
      </WhyLabsText>
      {!!rangeString && (
        <WhyLabsText inherit className={classes.cardDateRangeText}>
          {rangeString}
        </WhyLabsText>
      )}
      {renderLines()}
    </div>
  );
}
