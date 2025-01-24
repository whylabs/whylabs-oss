import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import EnvironmentPlugin from 'vite-plugin-environment';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      port: 3030,
      proxy: {
        '/api': 'http://localhost:8080',
      },
    },
    preview: {
      port: 3030,
    },
    plugins: [
      EnvironmentPlugin({ NODE_ENV: 'development' }),
      react({
        jsxImportSource: '@emotion/react',
        babel: {
          plugins: ['@babel/plugin-transform-react-display-name', '@emotion/babel-plugin'],
        },
      }),
    ],
    resolve: {
      alias: [
        { find: '~', replacement: path.resolve(__dirname, 'src') },
        { find: '~server', replacement: path.resolve(__dirname, '../src') },
      ],
    },
    define: {
      'process.env': {
        LOGROCKET_RELEASE: env.LOGROCKET_RELEASE,
      },
    },
  };
});
