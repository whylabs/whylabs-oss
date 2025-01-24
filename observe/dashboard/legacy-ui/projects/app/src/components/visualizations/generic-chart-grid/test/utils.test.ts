import { BOTTOM_AXIS_SIZE, DEFAULT_MAX_Y_VALUE, GRAPH_SIDE_OFFSET, GRAPH_TOP_OFFSET, LEFT_AXIS_SIZE } from '../utils';

describe('Prevent layout breaks', () => {
  it('Should have correct left axis default size', () => {
    expect(LEFT_AXIS_SIZE).toEqual(30);
  });

  it('Should have correct bottom axis default size', () => {
    expect(BOTTOM_AXIS_SIZE).toEqual(20);
  });

  it('Should have correct graph side offset size', () => {
    expect(GRAPH_SIDE_OFFSET).toEqual(40);
  });

  it('Should have correct graph top offset size', () => {
    expect(GRAPH_TOP_OFFSET).toEqual(3);
  });

  it('Should have correct graph default max y value', () => {
    expect(DEFAULT_MAX_Y_VALUE).toEqual(100);
  });
});
