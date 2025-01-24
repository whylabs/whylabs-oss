import { stringMax } from './stringUtils';

export const dashboardNameForBreadcrumb = (name: string) => stringMax(name, 32);
