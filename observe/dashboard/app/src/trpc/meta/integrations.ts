import { getIntegrationsCards } from '../../util/integration-cards-util';
import { authenticatedProcedure, router } from '../trpc';

export type IntegrationCardType = {
  coming_soon: boolean;
  description: string;
  title: string;
  logo: string;
  url: string;
  category: string;
};

export const integrations = router({
  listIntegrations: authenticatedProcedure.query(async (): Promise<IntegrationCardType[]> => {
    return getIntegrationsCards();
  }),
});
