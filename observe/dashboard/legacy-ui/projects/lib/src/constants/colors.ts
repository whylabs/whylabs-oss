export class Colors {
  /** Standard colors */
  static red = '#D11010';

  static orange = '#F07028';

  static yellow = '#FAAF40';

  static yellowLight = '#FFC000';

  static orangeLight = '#F06F27';

  static hoverLightGray = '#F0F3F5';

  static lightRed = '#FDF2F0';

  static lightRed2 = '#FFDADA';

  static darkHeader = '#021826';

  static darkHeaderAccent = '#1f3a49';

  static darkGray = '#495057';

  static lightGrayBorder = '#ced4da';

  static lightGray = '#E0E0E0';

  static disabledInputGray = '#F7F8F9';

  static gray600 = '#868E96';

  static gray900 = '#212529';

  static olive = '#B5CC18';

  static green = '#1DBB42';

  static teal = '#00B5AD';

  static blue = '#2683C9';

  static blue2 = '#2784CA';

  static violet = '#6435C9';

  static purple = '#A333C8';

  static pink = '#ED45A4';

  static brown = '#AC724D';

  static grey = '#778183';

  static black = '#1B1C1D';

  static white = '#FFFFFF';

  static transparent = '#FFFFFF00';

  static userAlertBackground = '#FFE4EE';

  /** Chart colors */
  static chartPrimary = '#005566';

  static chartOrange = '#F5843C';

  static chartYellow = '#FFDE1E';

  static chartBlue = '#2683C9';

  static chartLightBlue = '#2582C8';

  static chartAqua = '#44C0E7';

  static chartPurple = Colors.purple;

  static chartHoverBackground = '#c5cacb';

  static chartUnknown = '#778183';

  static buttonHover = 'rgba(205,248,255,0.25)';

  static chartColorArray = [
    Colors.chartPrimary,
    Colors.chartOrange,
    Colors.chartYellow,
    Colors.chartBlue,
    Colors.chartAqua,
    Colors.chartPurple,
  ];

  static comparisonColorArray = [Colors.chartPrimary, Colors.chartBlue, Colors.chartOrange, Colors.chartYellow];

  static profilesColorPool = [Colors.chartLightBlue, Colors.orange, Colors.purple];

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

  static brandSecondary50 = '#F5F9F9';

  static secondaryLight1000 = '#313B3D';

  static secondaryLight800 = '#636d6f';

  static secondaryLight900 = '#4F595B';

  static secondaryLight700 = '#778183';

  static secondaryLight300 = '#C7D1D3';

  static secondaryLight200 = '#DBE5E7';

  static secondaryLight100 = '#EBF1F3';

  static secondaryLight50 = '#F9F9F9';

  static brandRed4 = '#B30000';

  static brandRed3 = '#D72424';

  static brandRed2 = '#EB5656';

  static brandRed1 = '#FF8282';

  static night1 = '#021826';

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

  static mantineLightGray = '#ced4da';

  /** Background */
  static securedBlueGradient = `linear-gradient(91deg, ${Colors.blue} 16.83%, ${Colors.chartAqua} 84.77%)`;
}
