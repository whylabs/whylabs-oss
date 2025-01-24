import { HtmlTooltip, HtmlTooltipProps } from '@whylabs/observatory-lib';
import { useFeatureWidgetStyles } from 'hooks/useFeatureWidgetStyles';
import { WhyLabsText } from 'components/design-system';

export type FeatureControlWidgetProps = {
  title: string;
  first?: boolean;
  bumpDown?: boolean;
  children: React.ReactNode;
} & Partial<Omit<HtmlTooltipProps, 'children'>>;

const FeatureControlWidget: React.FC<FeatureControlWidgetProps> = ({
  title,
  first,
  bumpDown,
  tooltipContent,
  tooltipTitle,
  children,
}) => {
  const { classes: styles, cx } = useFeatureWidgetStyles();

  return (
    <div className={cx(styles.root, first ? styles.firstItem : '')}>
      <WhyLabsText inherit className={cx(styles.headlineText, bumpDown ? styles.bumpDown : '')}>
        {title}
        {tooltipContent && <HtmlTooltip tooltipTitle={tooltipTitle} tooltipContent={tooltipContent} />}
      </WhyLabsText>
      {children}
    </div>
  );
};

export default FeatureControlWidget;
