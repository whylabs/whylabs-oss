import { AlertCategory } from 'generated/graphql';
import { alertVariants } from 'components/controls/table/cells/AnomalyTypes';

export type AlertData = {
  category: AlertCategory;
  count: number;
};

type AlertItem = {
  label: string;
  value: number;
};

type GetAlertsData = {
  data: AlertData[];
  isDataCategory: boolean;
};

export function getAlertsData({ data, isDataCategory }: GetAlertsData): {
  alertCounts: number[];
  alertLabels: string[];
  totalAlerts: number;
} {
  const alertsMap: { [key: string]: AlertItem } = {};
  alertVariants.forEach(({ key, text }) => {
    // don't show performance alerts for datasets
    if (isDataCategory && key === AlertCategory.Performance) return;

    alertsMap[key] = { label: text, value: 0 };
  });

  let totalAlerts = 0;
  data.forEach(({ category, count }) => {
    totalAlerts += count;

    if (alertsMap[category]) {
      alertsMap[category].value += count;
    }
  });

  const alertCounts: number[] = [];
  const alertLabels: string[] = [];
  Object.values(alertsMap).forEach((alert) => {
    alertCounts.push(alert.value);
    alertLabels.push(alert.label);
  });

  return { alertCounts, alertLabels, totalAlerts };
}
