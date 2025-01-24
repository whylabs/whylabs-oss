import { Notifications } from '@mantine/notifications';
import { ThemeProvider } from '@material-ui/core';
import { createEmotionCache, MantineProvider } from '@mantine/core';
import { customMantineTheme } from 'ui/customMantineTheme';
import { LocalizationProvider } from '@material-ui/pickers';
import DateFnsUtils from '@material-ui/pickers/adapter/date-fns';
import { WhySidebar, WhySidebarProvider } from 'components/controls/widgets/sidebar/WhySidebar';
import '@fontsource/asap/300.css';
import '@fontsource/asap/400.css';
import '@fontsource/asap/500.css';
import '@fontsource/asap/600.css';
import '@fontsource/asap/700.css';
import '@fontsource/vt323';
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
import SectionErrorFallback from 'pages/errors/boundaries/SectionErrorFallback';
import { CookiesProvider } from 'react-cookie';
import { ErrorBoundary } from 'react-error-boundary';
import { BrowserRouter } from 'react-router-dom';
import { RecoilRoot } from 'recoil';
import { lightTheme } from 'ui/theme';
import { UserContextProvider } from 'UserContext';
import { TokensContextProvider } from 'TokensContext';
import './App.css';
import { useCSPNonce } from '@whylabs/observatory-lib';
import { WhyApolloProvider } from 'graphql/apollo';
import HCPlaceholder from 'hcplaceholder';
import { WhyRoutes } from './routes';
import { ImpersonationWarningBar } from './components/controls/widgets/ImpersonationWarningBar';
import { MaintenanceWarningBar } from './components/controls/widgets/maintenance-warning-bar/MaintenanceWarningBar';
import { DemoWarningBar } from './components/controls/widgets/demo-warning-bar/DemoWarningBar';

const App: React.FC = () => {
  const { cspNonce } = useCSPNonce();
  const emotionCache = createEmotionCache({ key: 'mantine', nonce: cspNonce });

  HCPlaceholder.setOptions({
    lang: {
      thousandsSep: ',',
    },
  });

  return (
    <RecoilRoot>
      <ThemeProvider theme={{ ...lightTheme }}>
        <BrowserRouter>
          <LocalizationProvider dateAdapter={DateFnsUtils}>
            <WhySidebarProvider>
              <WhyApolloProvider>
                <UserContextProvider>
                  <TokensContextProvider>
                    <CookiesProvider>
                      <MantineProvider emotionCache={emotionCache} theme={customMantineTheme}>
                        <Notifications limit={3} position="top-center" zIndex={99999} />
                        <MaintenanceWarningBar />
                        <ImpersonationWarningBar />
                        <DemoWarningBar />
                        <ErrorBoundary FallbackComponent={SectionErrorFallback}>
                          <WhySidebar />
                        </ErrorBoundary>
                        <WhyRoutes />
                      </MantineProvider>
                    </CookiesProvider>
                  </TokensContextProvider>
                </UserContextProvider>
              </WhyApolloProvider>
            </WhySidebarProvider>
          </LocalizationProvider>
        </BrowserRouter>
      </ThemeProvider>
    </RecoilRoot>
  );
};

export default App;
