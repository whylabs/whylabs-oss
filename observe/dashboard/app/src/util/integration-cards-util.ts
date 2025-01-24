import { LocalIntegrations } from './localIntegrations/localIntegrationConstants';

export type IntegrationCardData = {
  category: string;
  title: string;
  description: string;
  url: string;
  logo: string;
  coming_soon: boolean;
};

export const getIntegrationsCards = async (): Promise<IntegrationCardData[]> => {
  return LocalIntegrations;
};
