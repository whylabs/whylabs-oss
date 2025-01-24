import { HtmlTooltip, HtmlTooltipProps, stringMax } from '@whylabs/observatory-lib';
import { useFeatureWidgetStyles } from 'hooks/useFeatureWidgetStyles';
import { WhyLabsText } from 'components/design-system';

export type FeatureWidgetProps = {
  title: string;
  hero: string;
  capitalized?: boolean;
  first?: boolean;
  stretchy?: boolean;
} & Partial<HtmlTooltipProps>;

const FeatureWidget: React.FC<FeatureWidgetProps> = ({
  title,
  hero,
  capitalized,
  first,
  tooltipContent,
  tooltipTitle,
  stretchy,
}) => {
  const { classes: styles, cx } = useFeatureWidgetStyles();

  return (
    <div
      className={cx(
        styles.root,
        first ? [styles.firstItem, styles.firstWidget] : '',
        stretchy ? [styles.stretchy] : '',
      )}
    >
      <WhyLabsText inherit className={styles.headlineText}>
        {title}
        {tooltipContent && <HtmlTooltip tooltipTitle={tooltipTitle} tooltipContent={tooltipContent} />}
      </WhyLabsText>
      <WhyLabsText
        inherit
        className={cx(capitalized ? styles.capitalize : '', styles.heroText, styles.lengthRestricted)}
      >
        {stringMax(hero, 25)}
      </WhyLabsText>
    </div>
  );
};

export default FeatureWidget;
