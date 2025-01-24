import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { getByTextContent } from '~/utils/testUtils';
import { MemoryRouter } from 'react-router-dom';

import OverLimitAlert from './OverLimitAlert';

const { getByText } = screen;

describe('<OverLimitAlert />', () => {
  it('should have title', () => {
    getRenderer();
    expect(getByText(/Plan is over limits/i)).toBeInTheDocument();
  });

  it('should have text', () => {
    getRenderer();
    expect(
      getByTextContent(
        /Your current Starter Plan includes two projects for free. Please contact us to upgrade to the Expert Plan. Additional plan information can be found here./i,
      ),
    ).toBeInTheDocument();
  });

  it('should have alternate text to upgrade if indicated', () => {
    getRenderer('/upgrade');
    expect(getByText(/free monitoring and observability for two resources. Upgrade to the/i)).toBeInTheDocument();
  });
});

// Helpers
function getRenderer(paymentsUrl: string | null = null) {
  return render(
    <MemoryRouter>
      <MantineProvider>
        <OverLimitAlert paymentsUrl={paymentsUrl} />
      </MantineProvider>
    </MemoryRouter>,
  );
}
