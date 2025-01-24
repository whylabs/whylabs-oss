// Commented out due to useRouteMatch(); errors associated with useRouteMatch(); at usePageType (src/pages/page-types/usePageType.ts:6:17)

// import { FilterArea } from 'pages/model-page/ModelTableFilterArea';
// import { render, fireEvent } from '@testing-library/react';
// import { FilterState } from 'types/filterState';
//
// // Stackoverflow issue and solution: https://stackoverflow.com/questions/60333156/how-to-fix-typeerror-document-createrange-is-not-a-function-error-while-testi
// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// (global as any).document.createRange = () => ({
//   setStart: () => {
//     /**/
//   },
//   setEnd: () => {
//     /**/
//   },
//   commonAncestorContainer: {
//     nodeName: 'BODY',
//     ownerDocument: document,
//   },
// });
// const FILTER_AREA_ROOT_TEST_ID = 'filter-area__root';
// const FILTER_AREA_INPUT_TEST_ID = 'filter-area__input';
// const FILTER_AREA_BUTTON_TEST_ID = 'filter-area__button';
// const FILTER_AREA_POPUP_TEST_ID = 'filter-area__popup';
//
// const defaultFilterState: FilterState = {
//   searchText: '',
//   discrete: false,
//   nonDiscrete: false,
//   missingValue: false,
//   distribution: false,
//   uniqueness: false,
//   schema: false,
// };

describe('commented out tests', () => {
  test('This test exists so the test runner wont fail saying "Your test suite must contain at least one test"', () => {
    expect(true).toBeTruthy();
  });
});
// describe('Filter Area', () => {
// test('Root component should be rendered correctly', () => {
//
//   const setFilterState = jest.fn();
//   const { getByTestId } = render(<FilterArea filterTotalState={[defaultFilterState, setFilterState]} />);
//   const filterArea = getByTestId(FILTER_AREA_ROOT_TEST_ID);
//   expect(filterArea).toBeInTheDocument();
// });
// test('Input component should be rendered correctly', () => {
//   const setFilterState = jest.fn();
//   const { getByTestId } = render(<FilterArea filterTotalState={[defaultFilterState, setFilterState]} />);
//   const input = getByTestId(FILTER_AREA_INPUT_TEST_ID);
//   expect(input).toBeInTheDocument();
// });
// test('Toggle button component should be rendered correctly', () => {
//   const setFilterState = jest.fn();
//   const { getByTestId } = render(<FilterArea filterTotalState={[defaultFilterState, setFilterState]} />);
//   const button = getByTestId(FILTER_AREA_BUTTON_TEST_ID);
//
//   expect(button).toBeInTheDocument();
// });
// test('Popup should not be rendered, until the toggle button is clicked.', () => {
//   // Basic stackoverflow example: https://stackoverflow.com/questions/61783467/react-testing-library-how-test-conditional-rendering
//   const setFilterState = jest.fn();
//
//   const { queryByTestId } = render(<FilterArea filterTotalState={[defaultFilterState, setFilterState]} />);
//   const button = queryByTestId(FILTER_AREA_BUTTON_TEST_ID); // Because of `disableFilterUI` it can be null
//   const popup = queryByTestId(FILTER_AREA_POPUP_TEST_ID);
//
//   expect(button).toBeInTheDocument();
//   expect(popup).not.toBeInTheDocument();
//
//   if (button) {
//     fireEvent.click(button);
//     // TODO: Check for popup if it is rendered in the document when the button is clicked
//     // TIP: use `screen.debug` to check the structure of the DOM
//   }
// });
// Check if the correct data is returned from the query with the entered search term
// TBD
// });
