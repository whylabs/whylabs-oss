export const numberArrayMocks = {
  input: [1, 5, 3, 6, 8, 2, null, 4, 7, null, 9, 0],
  ascOutput: [null, null, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  descOutput: [9, 8, 7, 6, 5, 4, 3, 2, 1, 0, null, null],
};

export const oneAccessorNumberMocks = {
  input: [
    { timestamp: 170000 },
    { timestamp: 120000 },
    { timestamp: undefined },
    { timestamp: 100000 },
    { timestamp: null },
    { timestamp: 0 },
  ],
  ascOutput: [
    { timestamp: undefined },
    { timestamp: null },
    { timestamp: 0 },
    { timestamp: 100000 },
    { timestamp: 120000 },
    { timestamp: 170000 },
  ],
  descOutput: [
    { timestamp: 170000 },
    { timestamp: 120000 },
    { timestamp: 100000 },
    { timestamp: 0 },
    { timestamp: undefined },
    { timestamp: null },
  ],
};

export const twoAccessorsNumberMocks = {
  input: [
    { dataAvailability: { timestamp: 170000 } },
    { dataAvailability: { timestamp: 120000 } },
    { dataAvailability: { timestamp: undefined } },
    { dataAvailability: { timestamp: 100000 } },
    { dataAvailability: undefined },
    { dataAvailability: { timestamp: null } },
    { dataAvailability: { timestamp: 0 } },
  ],
  ascOutput: [
    { dataAvailability: { timestamp: undefined } },
    { dataAvailability: undefined },
    { dataAvailability: { timestamp: null } },
    { dataAvailability: { timestamp: 0 } },
    { dataAvailability: { timestamp: 100000 } },
    { dataAvailability: { timestamp: 120000 } },
    { dataAvailability: { timestamp: 170000 } },
  ],
  descOutput: [
    { dataAvailability: { timestamp: 170000 } },
    { dataAvailability: { timestamp: 120000 } },
    { dataAvailability: { timestamp: 100000 } },
    { dataAvailability: { timestamp: 0 } },
    { dataAvailability: { timestamp: undefined } },
    { dataAvailability: undefined },
    { dataAvailability: { timestamp: null } },
  ],
};

export const threeAccessorsNumberMocks = {
  input: [
    { model: { dataAvailability: { timestamp: 170000 } } },
    { model: { dataAvailability: { timestamp: 120000 } } },
    { model: { dataAvailability: { timestamp: undefined } } },
    { model: { dataAvailability: { timestamp: 100000 } } },
    { model: { dataAvailability: { timestamp: null } } },
    { model: { dataAvailability: { timestamp: 0 } } },
    { model: { dataAvailability: undefined } },
    { model: undefined },
  ],
  ascOutput: [
    { model: { dataAvailability: { timestamp: undefined } } },
    { model: { dataAvailability: { timestamp: null } } },
    { model: { dataAvailability: undefined } },
    { model: undefined },
    { model: { dataAvailability: { timestamp: 0 } } },
    { model: { dataAvailability: { timestamp: 100000 } } },
    { model: { dataAvailability: { timestamp: 120000 } } },
    { model: { dataAvailability: { timestamp: 170000 } } },
  ],
  descOutput: [
    { model: { dataAvailability: { timestamp: 170000 } } },
    { model: { dataAvailability: { timestamp: 120000 } } },
    { model: { dataAvailability: { timestamp: 100000 } } },
    { model: { dataAvailability: { timestamp: 0 } } },
    { model: { dataAvailability: { timestamp: undefined } } },
    { model: { dataAvailability: { timestamp: null } } },
    { model: { dataAvailability: undefined } },
    { model: undefined },
  ],
};

export const stringArrayMocks = {
  input: ['apple', 'angle', null, 'wonder', 'banana', null, 'whylabs', 'machine', 'learning'],
  ascOutput: [null, null, 'angle', 'apple', 'banana', 'learning', 'machine', 'whylabs', 'wonder'],
  descOutput: ['wonder', 'whylabs', 'machine', 'learning', 'banana', 'apple', 'angle', null, null],
};

export const oneAccessorStringMocks = {
  input: [
    { name: 'apple' },
    { name: 'angle' },
    { name: undefined },
    { name: 'wonder' },
    { name: 'banana' },
    { name: null },
  ],
  ascOutput: [
    { name: undefined },
    { name: null },
    { name: 'angle' },
    { name: 'apple' },
    { name: 'banana' },
    { name: 'wonder' },
  ],
  descOutput: [
    { name: 'wonder' },
    { name: 'banana' },
    { name: 'apple' },
    { name: 'angle' },
    { name: undefined },
    { name: null },
  ],
};

export const twoAccessorsStringMocks = {
  input: [
    { monitor: { displayName: 'apple' } },
    { monitor: { displayName: 'angle' } },
    { monitor: { displayName: undefined } },
    { monitor: { displayName: 'wonder' } },
    { monitor: { displayName: 'banana' } },
    { monitor: undefined },
    { monitor: { displayName: null } },
  ],
  ascOutput: [
    { monitor: { displayName: undefined } },
    { monitor: undefined },
    { monitor: { displayName: null } },
    { monitor: { displayName: 'angle' } },
    { monitor: { displayName: 'apple' } },
    { monitor: { displayName: 'banana' } },
    { monitor: { displayName: 'wonder' } },
  ],
  descOutput: [
    { monitor: { displayName: 'wonder' } },
    { monitor: { displayName: 'banana' } },
    { monitor: { displayName: 'apple' } },
    { monitor: { displayName: 'angle' } },
    { monitor: { displayName: undefined } },
    { monitor: undefined },
    { monitor: { displayName: null } },
  ],
};

export const threeAccessorsStringMocks = {
  input: [
    { monitor: { analyzer: { metric: 'apple' } } },
    { monitor: { analyzer: { metric: 'angle' } } },
    { monitor: { analyzer: { metric: undefined } } },
    { monitor: { analyzer: { metric: 'wonder' } } },
    { monitor: { analyzer: undefined } },
    { monitor: { analyzer: { metric: 'banana' } } },
    { monitor: { analyzer: { metric: null } } },
    { monitor: undefined },
  ],
  ascOutput: [
    { monitor: { analyzer: { metric: undefined } } },
    { monitor: { analyzer: undefined } },
    { monitor: { analyzer: { metric: null } } },
    { monitor: undefined },
    { monitor: { analyzer: { metric: 'angle' } } },
    { monitor: { analyzer: { metric: 'apple' } } },
    { monitor: { analyzer: { metric: 'banana' } } },
    { monitor: { analyzer: { metric: 'wonder' } } },
  ],
  descOutput: [
    { monitor: { analyzer: { metric: 'wonder' } } },
    { monitor: { analyzer: { metric: 'banana' } } },
    { monitor: { analyzer: { metric: 'apple' } } },
    { monitor: { analyzer: { metric: 'angle' } } },
    { monitor: { analyzer: { metric: undefined } } },
    { monitor: { analyzer: undefined } },
    { monitor: { analyzer: { metric: null } } },
    { monitor: undefined },
  ],
};

export const booleanArrayMocks = {
  input: [false, true, false, false, null, true],
  ascOutput: [null, false, false, false, true, true],
  descOutput: [true, true, false, false, false, null],
};

export const oneAccessorBooleanMocks = {
  input: [
    { enabled: false },
    { enabled: false },
    { enabled: undefined },
    { enabled: true },
    { enabled: true },
    { enabled: null },
  ],
  ascOutput: [
    { enabled: undefined },
    { enabled: null },
    { enabled: false },
    { enabled: false },
    { enabled: true },
    { enabled: true },
  ],
  descOutput: [
    { enabled: true },
    { enabled: true },
    { enabled: false },
    { enabled: false },
    { enabled: undefined },
    { enabled: null },
  ],
};

export const twoAccessorsBooleanMocks = {
  input: [
    { monitor: { enabled: false } },
    { monitor: { enabled: true } },
    { monitor: { enabled: undefined } },
    { monitor: { enabled: true } },
    { monitor: { enabled: false } },
    { monitor: undefined },
    { monitor: { enabled: null } },
  ],
  ascOutput: [
    { monitor: { enabled: undefined } },
    { monitor: undefined },
    { monitor: { enabled: null } },
    { monitor: { enabled: false } },
    { monitor: { enabled: false } },
    { monitor: { enabled: true } },
    { monitor: { enabled: true } },
  ],
  descOutput: [
    { monitor: { enabled: true } },
    { monitor: { enabled: true } },
    { monitor: { enabled: false } },
    { monitor: { enabled: false } },
    { monitor: { enabled: undefined } },
    { monitor: undefined },
    { monitor: { enabled: null } },
  ],
};

export const threeAccessorsBooleanMocks = {
  input: [
    { monitor: { analyzer: { enabled: false } } },
    { monitor: { analyzer: { enabled: true } } },
    { monitor: { analyzer: { enabled: undefined } } },
    { monitor: { analyzer: { enabled: false } } },
    { monitor: { analyzer: undefined } },
    { monitor: { analyzer: { enabled: true } } },
    { monitor: { analyzer: { enabled: null } } },
    { monitor: undefined },
  ],
  ascOutput: [
    { monitor: { analyzer: { enabled: undefined } } },
    { monitor: { analyzer: undefined } },
    { monitor: { analyzer: { enabled: null } } },
    { monitor: undefined },
    { monitor: { analyzer: { enabled: false } } },
    { monitor: { analyzer: { enabled: false } } },
    { monitor: { analyzer: { enabled: true } } },
    { monitor: { analyzer: { enabled: true } } },
  ],
  descOutput: [
    { monitor: { analyzer: { enabled: true } } },
    { monitor: { analyzer: { enabled: true } } },
    { monitor: { analyzer: { enabled: false } } },
    { monitor: { analyzer: { enabled: false } } },
    { monitor: { analyzer: { enabled: undefined } } },
    { monitor: { analyzer: undefined } },
    { monitor: { analyzer: { enabled: null } } },
    { monitor: undefined },
  ],
};
