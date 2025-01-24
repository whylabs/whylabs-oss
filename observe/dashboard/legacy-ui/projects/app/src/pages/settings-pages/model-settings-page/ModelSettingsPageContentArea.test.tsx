import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { MantineProvider } from '@mantine/core';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockUseWhyLabsSnackbar } from 'hooks/mocks/mockUseSnackbar';
import {
  CreateBulkSettingsPageDocument,
  CreateBulkSettingsPageMutationHookResult,
  ModelType,
  TimePeriod,
} from 'generated/graphql';
import { MemoryRouter } from 'react-router';
import ModelSettingsPageContentArea from './ModelSettingsPageContentArea';

const { findByRole, findByText, getByRole, getByLabelText } = screen;

const RESOURCE_NAME_LABEL = 'Model or dataset name';
const TOTAL_TO_ADD_LABEL = 'Total to add';
const RESOURCE_TYPE_LABEL = 'Resource type';
const BATCH_FREQUENCY_LABEL = 'Batch frequency';
const SUBMIT_BUTTON = 'Add models or datasets';

describe('<ModelSettingsPageContentArea />', () => {
  beforeEach(() => {
    mockUseWhyLabsSnackbar();
  });

  it('should have description text', async () => {
    getRenderer();
    expect(
      await findByText(
        /Use the form to add models or datasets to your organization\. You can edit settings via the table\./i,
      ),
    ).toBeInTheDocument();
  });

  it.each([RESOURCE_NAME_LABEL, TOTAL_TO_ADD_LABEL])('should render %p textbox field', async (name) => {
    getRenderer();
    expect(await findByRole('textbox', { name })).toBeInTheDocument();
  });

  it.each([RESOURCE_TYPE_LABEL, BATCH_FREQUENCY_LABEL])('should render %p select field', async (label) => {
    getRenderer();
    expect(await findByRole('searchbox', { name: label })).toBeInTheDocument();
  });

  it('should render submit button disabled by default', async () => {
    getRenderer();
    expect(await findByRole('button', { name: SUBMIT_BUTTON })).toHaveAttribute('data-disabled', 'true');
  });

  it('should enable submit button disabled when user types the resource name', async () => {
    getRenderer();

    userEvent.type(await findByRole('textbox', { name: RESOURCE_NAME_LABEL }), 'A');
    expect(getSubmitButton()).toBeEnabled();
  });

  it.each(['Model 1', 'Dataset 2'])('should allow user to set the resource name to %p', async (expected) => {
    getRenderer();

    const textbox = await findByRole('textbox', { name: RESOURCE_NAME_LABEL });
    userEvent.type(textbox, expected);
    expect(textbox).toHaveValue(expected);
  });

  it.each(['Classification model', 'Regression model', 'Data stream'])(
    'should allow user to set the Resource type to %p',
    async (expected) => {
      getRenderer();

      const input = await findByRole('searchbox', { name: RESOURCE_TYPE_LABEL });
      userEvent.clear(input);
      userEvent.paste(input, expected);
      userEvent.click(getByRole('option', { name: expected }));
      expect(input).toHaveValue(expected);
    },
  );

  it.each(['Weekly', 'Monthly'])('should allow user to set the Batch frequency to %p', async (expected) => {
    getRenderer();

    const input = await findByRole('searchbox', { name: BATCH_FREQUENCY_LABEL });
    userEvent.clear(input);
    userEvent.paste(input, expected);
    userEvent.click(getByRole('option', { name: expected }));
    expect(input).toHaveValue(expected);
  });

  it.each(['5', '15'])('should allow user to set the total to add to %p', async (expected) => {
    getRenderer();

    const textbox = await findByRole('textbox', { name: TOTAL_TO_ADD_LABEL });
    userEvent.clear(textbox);
    userEvent.type(textbox, expected);
    expect(textbox).toHaveValue(expected);
  });

  it.skip('should allow user to add new model or dataset and reset the form after it', async () => {
    const resourceName = 'New Resource';
    const addMutationMock = jest.fn(() => ({
      data: { models: { createBulk: [{ id: 'resource-id', name: resourceName }] } },
    }));
    const mocks: MocksType = [
      {
        request: {
          query: CreateBulkSettingsPageDocument,
          variables: {
            modelName: resourceName,
            modelType: ModelType.Regression,
            quantityNum: 12,
            timePeriod: TimePeriod.P1M,
          },
        },
        newData: addMutationMock,
      },
    ];

    getRenderer(mocks);

    // Set values
    const resourceNameInput = await findByRole('textbox', { name: RESOURCE_NAME_LABEL });
    userEvent.paste(resourceNameInput, resourceName);

    const resourceTypeInput = getByLabelText(RESOURCE_TYPE_LABEL);
    userEvent.click(resourceTypeInput);
    userEvent.click(getByRole('option', { name: 'Regression model' }));

    const batchFrequencyInput = getByLabelText(BATCH_FREQUENCY_LABEL);
    userEvent.click(batchFrequencyInput);
    userEvent.click(getByRole('option', { name: 'Monthly' }));

    const totalToAddInput = getByRole('textbox', { name: TOTAL_TO_ADD_LABEL });
    userEvent.type(totalToAddInput, '2');

    // Submit
    userEvent.click(getSubmitButton(), undefined, { clickCount: 2 });
    await waitFor(() => expect(addMutationMock).toHaveBeenCalledTimes(1));

    // Form should reset
    expect(resourceNameInput).toHaveValue('');
    expect(totalToAddInput).toHaveValue('1');
    expect(resourceTypeInput).toHaveValue('');
    expect(batchFrequencyInput).toHaveValue('Daily');
  }, 15000);

  it.todo('should display table title using org name and id');

  it('should display table with correct headers', async () => {
    getRenderer();
    expect(await findByRole('table')).toBeInTheDocument();

    ['ID', 'Name', 'Type', 'Batch frequency'].forEach((header) => {
      expect(getByRole('columnheader', { name: header })).toBeInTheDocument();
    });
  });

  it.todo('should display table with correct rows');
  it.todo("should allow user to filter table's rows");
});

// Helpers
type MocksType = MockedResponse<CreateBulkSettingsPageMutationHookResult>[];
function getRenderer(mocks?: MocksType) {
  return render(
    <MemoryRouter>
      <MockedProvider mocks={mocks} addTypename={false}>
        <MantineProvider>
          <ModelSettingsPageContentArea />
        </MantineProvider>
      </MockedProvider>
    </MemoryRouter>,
  );
}

function getSubmitButton() {
  return getByRole('button', { name: SUBMIT_BUTTON });
}
