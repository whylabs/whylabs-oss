// Import fonts
import '@fontsource/asap/300.css';
import '@fontsource/asap/300-italic.css';
import '@fontsource/asap/400.css';
import '@fontsource/asap/400-italic.css';
import '@fontsource/asap/500.css';
import '@fontsource/asap/500-italic.css';
import '@fontsource/asap/600.css';
import '@fontsource/asap/600-italic.css';
import '@fontsource/asap/700.css';
import '@fontsource/asap/700-italic.css';
import '@fontsource/baloo-2/400.css';
import '@fontsource/baloo-2/500.css';
import '@fontsource/baloo-2/600.css';
import '@fontsource/baloo-2/700.css';
import '@fontsource/baloo-2/800.css';
import '@fontsource/inconsolata/300.css';
import '@fontsource/inconsolata/400.css';
import '@fontsource/inconsolata/500.css';
import '@fontsource/inconsolata/600.css';
import '@fontsource/inconsolata/700.css';
import '@fontsource/inconsolata/800.css';
import '@fontsource/inconsolata/900.css';
import '@fontsource/inter';
import '@fontsource/vt323';

import './App.css';

import { MantineProvider, createEmotionCache } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { WithTRPC } from '~/decorator/WithTRPC';
import { useCSPNonce } from '~/hooks/useCSPNonce';
import HCPlaceholder from 'hcplaceholder';

import AppRouter from './AppRouter';
import { WhyLabsSidebarProvider } from './components/sidebar/WhyLabsSidebar';
import { customMantineTheme } from './customMantineTheme';
import { ensureHeapAnalytics } from './telemetry';

export const App = () => {
  const { cspNonce } = useCSPNonce();
  const emotionCache = createEmotionCache({ key: 'mantine', nonce: cspNonce });

  ensureHeapAnalytics();

  HCPlaceholder.setOptions({
    lang: {
      noData: 'No data to display',
      thousandsSep: ',',
    },
    tooltip: {
      // Display UTC time in the tooltip
      xDateFormat: '%Y-%m-%d %H:%M:%S UTC',
    },
    time: {
      // HCPlaceholder already defaults it to true, but let's set it to be sure
      useUTC: true,
    },
  });

  return (
    <WithTRPC>
      <WhyLabsSidebarProvider>
        <MantineProvider emotionCache={emotionCache} theme={customMantineTheme}>
          <Notifications limit={3} position="top-center" zIndex={99999} />
          <AppRouter />
        </MantineProvider>
      </WhyLabsSidebarProvider>
    </WithTRPC>
  );
};
