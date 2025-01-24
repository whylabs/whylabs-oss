/**
 * Describes a grid of card objects. This can take up a page, a tab, or
 * any area where multiple cards are expected to be displayed.
 */
export interface Grid {
  /**
   * The set of full cards and locations.
   */
  contents: Card[];

  /**
   * The set of all dynamic color arrays used in the cards
   */
  dynamicColors?: DynamicColor[];
}

export interface Dimensions {
  /**
   * The number of columns that this grid object should span.
   *
   * @minimum 1
   * @TJS-type integer
   */
  columnSpan: number;

  /**
   * The number of rows that this grid object should span.
   *
   * @minimum 1
   * @TJS-type integer
   */
  rowSpan: number;
}

/**
 * Describes text imparting information about the contents of a card or mini card.
 * This is not designed to be used for the "value" displays, but for the titles.
 */
export interface InfoText {
  text: string;
  tooltip?: string;
}

export interface ValueAttributes {
  valueType: "string" | "date" | "number" | "percentage";

  /**
   * Only applicable to number and percentage types. Otherwise ignored.
   * @minimum 0
   * @TJS-type integer
   */
  precision?: number;

  /**
   * Only applicable to date types. Otherwise ignored.
   */
  dateFormat?: string;

  /**
   * Only applicable to string types. Otherwise ignored.
   * @minimum 1
   * @TJS-type integer
   */
  minStringLength?: number;
}

/**
 * Information for the "hero" or headline text for a component. These are intended
 * to be mostly numeric, but we should allow flexibility.
 */
export interface HeroTextProperties {
  /**
   * Text to be displayed when there is no current value.
   */
  emptyText?: string;

  valueAttributes?: ValueAttributes;
  /**
   * Often used to show the raw value of a hero value expressed in a percentage
   */
  subHeaderAttributes?: ValueAttributes;
}

export interface Card {
  /**
   * Information about the layout of the card
   */
  config: CardLayout;

  /**
   * Which "megacolumn" of the dashboard this card should be placed into.
   * @minimum 1
   * @maximum 3
   * @TJS-type integer
   */
  gridArea: number;

  /**
   * The title of the card
   */
  title: InfoText;
  /**
   * The main content of the card, usually the result of a query or calculation.
   */
  heroProperties: HeroTextProperties;

  /**
   * A query ID value used to determine what information to pull to get values to the card.
   * Later iterations will involve the ability to specify exactly what values to query.
   */
  queryId: string;

  subGrid?: SubGrid;

  graphType: 'lineChart' | 'stackedBarTimeSeries' | 'timeSeries';

  // TODO: add query information here.
}

/**
 * Describes a sub grid that is intended to be contained within a Card.
 */
export interface SubGrid {
  contents: MiniCard[];
}

export interface MiniCard {
  config: MiniCardLayout;
  title: InfoText;
  hero: HeroTextProperties;
  /**
   * A field ID value used to determine what information to pull from the main card's query information.
   * Later iterations will involve the ability to specify exactly what values to query.
   */
  fieldId: string;
}

export interface DynamicColor {
  thresholdInfo: ThresholdColorInfo[];
  id: string;
  /**
   * By default, the values in a threshold color are assumed to be increasing.
   * For instance, if the thresholds are 0.3, 0.5, 0.8, then values of -Infinity <= x < 0.3 will use
   * the first color info, 0.3 <= x < 0.5 the second, etc.
   *
   * If this value is true, then the opposite logic will be used.
   */
  decreasing?: boolean;
}

export interface ThresholdColorInfo {
  /**
   * The number at which this color info should STOP being used, exclusive. Whether this indicates going
   * up or down is defined in the DynamicColor.
   */
  threshold: number;
  colorInfo: ColorInfo;
}

export interface ColorInfo {
  color: string;
  backgroundColor: string;
  hasBorder?: boolean;
  dynamicColorId?: string;
}

export interface CardLayout {
  dimensions: Dimensions;
  colorInfo: ColorInfo;
  dynamicColorId?: string;
}

export interface MiniCardLayout {
  colorInfo?: ColorInfo;
}
