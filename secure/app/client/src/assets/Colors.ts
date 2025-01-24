export class Colors {
  /** Standard colors */
  static red = '#D11010';

  static orange = '#F07028';

  static yellow = '#FAAF40';

  static darkGray = '#495057';

  static green = '#1DBB42';

  static teal = '#00B5AD';

  static blue = '#2683C9';

  static purple = '#A333C8';

  static grey = '#778183';

  static lightGray = '#E0E0E0';

  static black = '#1B1C1D';

  static white = '#FFFFFF';

  static transparent = '#FFFFFF00';

  /** Chart colors */
  static chartPrimary = '#005566';

  static chartOrange = '#F5843C';

  static chartBlue = '#2683C9';

  static llmTraceBadgesBackground = {
    trace: '#021826',
    span: '#C7D1D3',
    completion: '#83E199',
    interaction: '#B7DDFF',
    guardrails: '#FFED8B',
  };

  static gray900 = '#212529';

  static disabledInputGray = '#F7F8F9';

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

  static secondaryLight300 = '#C7D1D3';

  static secondaryLight200 = '#DBE5E7';

  static secondaryLight100 = '#EBF1F3';

  static secondaryLight50 = '#F9F9F9';

  static brandRed4 = '#B30000';

  static lightRed = '#FDF2F0';

  static darkHeader = '#021826';

  static darkHeaderAccent = '#1f3a49';

  /** Purpose colors */
  static textColor = Colors.brandSecondary900;

  static linkColor = Colors.brandPrimary900;

  static infoColor = Colors.blue;

  static warningColor = Colors.yellow;

  static tealBackground = '#EAF2F3';

  static whiteBackground = '#FFFFFF';

  static drawerBorder = '#FFFFFF50';

  static attrColor = '#addb67';

  /** Other */
  static royalAubergine = '#670057';

  static hotPink = '#E03F9D';

  static radiantPink = '#E029CA';

  static deepAzure = '#2962BD';

  static azureSky = '#00C7F3';

  static rusticAmber = '#A25320';

  static deepScarlet = '#AA0000';

  static mantineLightGray = '#ced4da';
}

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
