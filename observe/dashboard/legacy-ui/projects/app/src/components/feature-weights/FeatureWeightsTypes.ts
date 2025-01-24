import { useMantineTheme } from '@mantine/core';
import { FeatureSortBy, SortDirection } from 'generated/graphql';
import { Colors } from '@whylabs/observatory-lib';
import { MouseBounds } from 'types/genericTypes';

export interface ExplainabilityTabProps {
  showTopFeatures: number;
  comparedResourceId?: string;
  sortBy?: FeatureSortBy;
}

export interface WeightsChartLegendProps {
  colorScheme: SchemeOptionShape;
  size?: 'md' | 'sm';
}

export interface FeatureHover {
  featureName: string;
  hoverData?: MouseBounds;
}

export type ColorSchemeOption = 'primary' | 'secondary';
export type SchemeOption = 'positive' | 'negative';
export type SchemeOptionShape = {
  [opt in SchemeOption]: { bgColor: string; hoverBgColor: string; backdropColor: string; labelColor: string };
};
type ColorSchemes = {
  [scheme in ColorSchemeOption]: SchemeOptionShape;
};

export type SortByOption = { label: string; value: FeatureSortBy };
export const SortByOptions: SortByOption[] = [
  {
    label: 'Rank',
    value: FeatureSortBy.WeightRank,
  },
  {
    label: 'Absolute Weight',
    value: FeatureSortBy.AbsoluteWeight,
  },
  {
    label: 'Name',
    value: FeatureSortBy.Name,
  },
  {
    label: 'Alert count',
    value: FeatureSortBy.AlertCount,
  },
];

export const sortByDefaultDirection = new Map<FeatureSortBy, SortDirection>([
  [FeatureSortBy.Weight, SortDirection.Desc],
  [FeatureSortBy.AbsoluteWeight, SortDirection.Desc],
  [FeatureSortBy.WeightRank, SortDirection.Asc],
  [FeatureSortBy.Name, SortDirection.Asc],
  [FeatureSortBy.AlertCount, SortDirection.Asc],
]);

export const useColorSchemePalette = (colorScheme: ColorSchemeOption): SchemeOptionShape => {
  const theme = useMantineTheme();
  const schemes: ColorSchemes = {
    primary: {
      positive: {
        bgColor: Colors.chartAqua,
        hoverBgColor: '#3daed1',
        backdropColor: theme.colors.gray[4],
        labelColor: Colors.brandPrimary900,
      },
      negative: {
        bgColor: Colors.chartBlue,
        hoverBgColor: '#2171ad',
        backdropColor: theme.colors.gray[4],
        labelColor: Colors.brandPrimary900,
      },
    },
    secondary: {
      positive: {
        bgColor: Colors.chartYellow,
        hoverBgColor: '#e6c81c',
        backdropColor: theme.colors.gray[4],
        labelColor: Colors.brandPrimary900,
      },
      negative: {
        bgColor: Colors.chartOrange,
        hoverBgColor: '#d47133',
        backdropColor: theme.colors.gray[4],
        labelColor: Colors.brandPrimary900,
      },
    },
  };

  return schemes[colorScheme];
};
