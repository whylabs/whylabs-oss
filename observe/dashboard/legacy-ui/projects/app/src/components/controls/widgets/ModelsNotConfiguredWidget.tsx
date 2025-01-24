import { useModelWidgetStyles } from 'hooks/useModelWidgetStyles';
import useTypographyStyles from 'styles/Typography';
import { HtmlTooltip } from '@whylabs/observatory-lib';
import { WhyLabsText } from 'components/design-system';

const MODELS_NOT_CONFIGURED_TOOLTIP = 'The time of the next scheduled monitor run, if one exists.';

export const ModelsNotConfiguredWidget: React.FC = () => {
  const { classes: typography, cx } = useTypographyStyles();
  const { classes: modelStyles } = useModelWidgetStyles();

  return (
    <div className={modelStyles.root}>
      <div className={modelStyles.headlineColumn}>
        <WhyLabsText inherit className={cx(typography.widgetTitle, modelStyles.bolded, modelStyles.headline)}>
          Next monitor run
          <HtmlTooltip tooltipContent={MODELS_NOT_CONFIGURED_TOOLTIP} />
        </WhyLabsText>
        <div>
          <WhyLabsText inherit className={cx(typography.widgetHighlightNumber, modelStyles.heroText)}>
            Not scheduled
          </WhyLabsText>
        </div>
      </div>
    </div>
  );
};
