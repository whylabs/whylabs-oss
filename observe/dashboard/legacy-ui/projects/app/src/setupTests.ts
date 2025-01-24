import resizeObserverPolyfill from 'resize-observer-polyfill';
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect';

// Fix 'ResizeObserver is not defined' error when running tests
window.ResizeObserver = window.ResizeObserver || resizeObserverPolyfill;
