// Import fonts
import '@fontsource/asap/300.css';
import '@fontsource/asap/400.css';
import '@fontsource/asap/500.css';
import '@fontsource/asap/600.css';
import '@fontsource/asap/700.css';
import '@fontsource/baloo-2';
import '@fontsource/inconsolata';
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
import HCPlaceholder from 'hcplaceholder';
import { WithTRPC } from '~/decorator/WithTRPC';
import { useCSPNonce } from '~/hooks/useCSPNonce';

import AppRouter from './AppRouter';
import { customMantineTheme } from './customMantineTheme';

export const App = () => {
  const { cspNonce } = useCSPNonce();
  const emotionCache = createEmotionCache({ key: 'mantine', nonce: cspNonce });

  HCPlaceholder.setOptions({
    lang: {
      noData: 'No data to display',
      thousandsSep: ',',
    },
  });

  return (
    <WithTRPC>
      <MantineProvider emotionCache={emotionCache} theme={customMantineTheme}>
        <Notifications limit={3} position="top-center" zIndex={99999} />
        <AppRouter />
      </MantineProvider>
    </WithTRPC>
  );
};
