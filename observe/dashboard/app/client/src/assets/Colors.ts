export class Colors {
  /** Standard colors */
  static red = '#D11010';

  static orange = '#F07028';

  static yellow = '#FAAF40';

  static yellowLight = '#FFC000';

  static yellowWarning = '#FBB027';

  static yellowWarningBackground = '#FFF7E9';

  static orangeLight = '#F06F27';

  static olive = '#B5CC18';

  static darkGray = '#495057';

  static green = '#1DBB42';

  static teal = '#00B5AD';

  static blue = '#2683C9';

  static violet = '#6435C9';

  static purple = '#A333C8';

  static pink = '#ED45A4';

  static brown = '#AC724D';

  static gray = '#778183';

  static lightGray = '#E0E0E0';

  static black = '#1B1C1D';

  static white = '#FFFFFF';

  static transparent = '#FFFFFF00';

  static userAlertBackground = '#FFE4EE';

  /** Chart colors */
  static chartPrimary = '#005566';

  static disabledChartPrimary = '#8fadb3';

  static chartOrange = '#F5843C';

  static lightOrange = '#ffd8a8';

  static chartYellow = '#FFDE1E';

  static chartBlue = '#2683C9';

  static chartAqua = '#44C0E7';

  static lightBlue = '#a5d8ff';

  static chartPurple = Colors.purple;

  static chartHoverBackground = '#c5cacb';

  static chartUnknown = '#778183';

  static buttonHover = 'rgba(205,248,255,0.25)';

  static llmTraceBadgesBackground = {
    trace: '#021826',
    span: '#C7D1D3',
    completion: '#83E199',
    interaction: '#B7DDFF',
    guardrails: '#FFED8B',
  };

  static chartColorArray = [
    Colors.chartPrimary,
    Colors.chartOrange,
    Colors.chartYellow,
    Colors.chartBlue,
    Colors.chartAqua,
    Colors.chartPurple,
  ];

  static gray600 = '#868E96';

  static gray900 = '#212529';

  static disabledInputGray = '#F7F8F9';

  static comparisonColorArray = [Colors.chartPrimary, Colors.chartBlue, Colors.chartOrange, Colors.chartYellow];

  static profilesColorPool = [Colors.chartPrimary, Colors.blue, Colors.chartAqua];

  static alertBarArray = [Colors.chartPrimary, Colors.chartOrange, Colors.chartAqua, Colors.chartBlue];

  static alertStackedBarArray = [
    Colors.chartAqua,
    Colors.chartPrimary,
    Colors.chartOrange,
    Colors.chartYellow,
    Colors.chartUnknown,
  ];

  static quantileMedium = '#7AC0CB';

  static quantileLight = '#D2F9FF';

  static hoverLightGray = '#F0F3F5';

  static lightGrayBorder = '#ced4da';

  /** Branded colors */
  static brandPrimary900 = '#0E7384';

  static brandPrimary800 = '#228798';

  static brandPrimary700 = '#369BAC';

  static brandPrimary600 = '#4AAFC0';

  static brandPrimary500 = '#5EC3D4';

  static brandPrimary400 = '#72D7E8';

  static brandPrimary300 = '#86EBFC';

  static brandPrimary200 = '#A6F2FF';

  static brandPrimary100 = '#CDF8FF';

  static brandSecondary900 = '#4F595B';

  static brandSecondary800 = '#636D6F';

  static brandSecondary700 = '#778183';

  static brandSecondary600 = '#8B9597';

  static brandSecondary500 = '#9FA9AB';

  static brandSecondary400 = '#B3BDBF';

  static brandSecondary300 = '#C7D1D3';

  static brandSecondary200 = '#DBE5E7';

  static brandSecondary100 = '#EBF2F3';

  static secondaryLight1000 = '#313B3D';

  static secondaryLight800 = '#636d6f';

  static secondaryLight900 = '#4F595B';

  static secondaryLight700 = '#778183';

  static secondaryLight500 = '#9FA9AB';

  static secondaryLight300 = '#C7D1D3';

  static secondaryLight200 = '#DBE5E7';

  static secondaryLight100 = '#EBF1F3';

  static secondaryLight50 = '#F9F9F9';

  static brandRed4 = '#B30000';

  static brandRed3 = '#D72424';

  static brandRed2 = '#EB5656';

  static brandRed1 = '#FF8282';

  static lightRed = '#FDF2F0';

  static darkHeader = '#021826';

  static darkHeaderAccent = '#1f3a49';

  /** Purpose colors */
  static textColor = Colors.brandSecondary900;

  static linkColor = Colors.brandPrimary900;

  static infoColor = Colors.blue;

  static warningColor = Colors.yellow;

  static tealBackground = '#EAF2F3';

  static pageBackground = '#E5E5E5';

  static contrastTableRow = '#FAFAFA';

  static whiteBackground = '#FFFFFF';

  static primaryBackground = Colors.pageBackground;

  static tooltipBackground = '#616161';

  static tooltipBackgroundRGBA = 'rgba(97, 97, 97, 0.9)';

  static drawerBorder = '#FFFFFF50';

  /** Code colors */
  static darkCodeBackground = '#282A36';

  static codePink = '#d976b4';

  static codePurple = '#ac8ce5';

  static codeComment = '#6571a1';

  static codeText = '#f8f8f2';

  static editorBackground = '#011627';

  static attrColor = '#addb67';

  /** Other */
  static darkOrange = '#e68a4d';

  static royalAubergine = '#670057';

  static velvetMagenta = '#A9237D';

  static hotPink = '#E03F9D';

  static radiantPink = '#E029CA';

  static electricMagenta = '#CC00FF';

  static deepAzure = '#2962BD';

  static azureSky = '#00C7F3';

  static rusticAmber = '#A25320';

  static vividEmber = '#E83802';

  static deepScarlet = '#AA0000';

  static mantineLightGray = '#ced4da';
}

/**
 * Converts HSL (Hue, Saturation, Lightness) color values to a hexadecimal color string.
 * @param hue - The hue value (0-360).
 * @param saturation - The saturation value (0-100).
 * @param lightness - The lightness value (0-100).
 * @returns The hexadecimal color string.
 */
const hslToHex = (hue: number, saturation: number, lightness: number) => {
  const s = saturation > 100 ? 100 : saturation;
  let l = lightness > 100 ? 100 : lightness;
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0'); // convert to Hex and prefix "0" if needed
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

/**
 * Returns an array of HSL color values based on the given index.
 * The hue value is calculated using the golden angle.
 *
 * @param index - The index used to calculate the hue value.
 * @returns An array of HSL color values [hue, saturation, lightness].
 */
/**
 * Calculates the HSL color values for a given index.
 * @param index - The index used to calculate the hue value.
 * @param saturation - The saturation value (default: 80).
 * @param lightness - The lightness value (default: 40).
 * @returns An array containing the HSL color values [hue, saturation, lightness].
 */
const hslColorForIndex = (index: number, saturation = 80, lightness = 40) => {
  const hue = index * 137.508; // Use golden angle
  const h = hue % 360;
  return [h, saturation, lightness];
};

/**
 * A pure function that converts an index to a hexadecimal color code.
 *
 * @param index - The index to convert.
 * @returns The hexadecimal color code.
 */
const hexColorForIndex = (index: number) => {
  const [hue, saturation, lightness] = hslColorForIndex(index);
  return hslToHex(hue, saturation, lightness);
};

/**
 * Returns the chart color for the given index.
 * If the index is within the range of available colors, it returns the color from the `Colors.chartColorArray`.
 * Otherwise, it generate a color based on the index.
 *
 * @param index - The index of the color.
 * @returns The chart color for the given index.
 */
export const chartColorForIndex = (index: number) => {
  if (index < Colors.chartColorArray.length) return Colors.chartColorArray[index];

  return hexColorForIndex(index);
};

/**
 * Returns the LLMSecure color based on the provided context.
 * @param context - The context for which the LLMSecure color is needed.
 * @returns The LLMSecure color corresponding to the provided context.
 */
export const getLLMSecureColor = (context: string) => {
  if (!context) return Colors.brandSecondary800;

  const contextToMatch = context.toLowerCase();
  const didMatch = (texts: string[]) =>
    texts.some((t) => {
      const text = t.toLowerCase();

      // If the context contains an underscore, try to match the space separated version as well
      if (text.includes('_')) {
        const spaceSeparatedTextVersion = text.replace(/_/g, ' ');
        if (contextToMatch.includes(spaceSeparatedTextVersion)) return true;
      }

      return contextToMatch.includes(text);
    });

  if (didMatch(['theme'])) return Colors.royalAubergine;

  // Must come before 'injection' to get the correct color
  if (didMatch(['proactive_injection_detection'])) return Colors.radiantPink;

  if (didMatch(['bad_actor', 'flag', 'injection'])) return Colors.orange;

  if (didMatch(['sentiment'])) return Colors.hotPink;

  if (didMatch(['customer_experience', 'toxicity'])) return Colors.chartPrimary;

  if (didMatch(['topic'])) return Colors.deepAzure;

  if (didMatch(['cost', 'text_stat'])) return Colors.blue;

  if (didMatch(['hallucination', 'truthfulness'])) return Colors.azureSky;

  if (didMatch(['input', 'output'])) return Colors.rusticAmber;

  if (didMatch(['block', 'misuse', 'regex'])) return Colors.red;

  if (didMatch(['pii'])) return Colors.deepScarlet;

  if (didMatch(['refusal'])) return Colors.brandPrimary900;

  // Fallback
  return Colors.brandSecondary800;
};
