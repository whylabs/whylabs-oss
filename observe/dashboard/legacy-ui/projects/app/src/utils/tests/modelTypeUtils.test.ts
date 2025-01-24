import { AssetCategory, ModelType } from 'generated/graphql';
import {
  getGroupLabelForModelType,
  getLabelForModelType,
  getValidOrUnknownModelType,
  isItModelOrDataTransform,
  isModelType,
} from '../modelTypeUtils';

describe('modelTypeUtils', () => {
  describe('getLabelForModelType()', () => {
    it.each([
      ['Classification model', ModelType.Classification],
      ['Regression model', ModelType.Regression],
      ['Embeddings model', ModelType.Embeddings],
      ['Other model', ModelType.ModelOther],
      ['Data source', ModelType.DataSource],
      ['Data stream', ModelType.DataStream],
      ['Data transform', ModelType.DataTransform],
      ['Other dataset', ModelType.DataOther],
      ['Not defined', ModelType.Unknown],
    ])(`should return %p for %p`, (expected, type) => {
      expect(getLabelForModelType(type)).toEqual(expected);
    });

    it.each([null, undefined, '', 'abc'])(`should throw error for %p`, (key) => {
      // @ts-expect-error - typescript don't allow to pass null or undefined to the function
      expect(() => getLabelForModelType(key)).toThrowError();
    });
  });

  describe('getGroupLabelForModelType()', () => {
    it.each([ModelType.Classification, ModelType.Regression, ModelType.Embeddings, ModelType.ModelOther])(
      `should return Model types for %p`,
      (type) => {
        expect(getGroupLabelForModelType(type)).toEqual('Model types');
      },
    );

    it.each([ModelType.DataSource, ModelType.DataStream, ModelType.DataTransform, ModelType.DataOther])(
      `should return Dataset types for %p`,
      (type) => {
        expect(getGroupLabelForModelType(type)).toEqual('Dataset types');
      },
    );
  });

  describe('getValidOrUnknownModelType()', () => {
    it.each(Object.values(ModelType))(`should return %p`, (key) => {
      expect(getValidOrUnknownModelType(key)).toEqual(key);
    });

    it.each([null, undefined, '', 'abc'])(`should return ModelType.Unknown for %p`, (key) => {
      expect(getValidOrUnknownModelType(key)).toEqual(ModelType.Unknown);
    });
  });

  describe('isModelType()', () => {
    it.each(Object.values(ModelType))('should return true for %p', (key) => {
      expect(isModelType(key)).toEqual(true);
    });

    it.each(['', 'abc', null, undefined])('should return false for %p', (key) => {
      expect(isModelType(key)).toEqual(false);
    });
  });

  describe('isItModelOrDataTransform()', () => {
    it('should return true for model', () => {
      expect(
        isItModelOrDataTransform({
          category: AssetCategory.Model,
          type: ModelType.Classification,
        }),
      ).toEqual(true);
    });

    it('should return true for data transform', () => {
      expect(
        isItModelOrDataTransform({
          category: AssetCategory.Data,
          type: ModelType.DataTransform,
        }),
      ).toEqual(true);
    });

    it.each([ModelType.DataSource, ModelType.DataStream, ModelType.DataOther])('should return false for %p', (type) => {
      expect(isItModelOrDataTransform({ category: AssetCategory.Data, type })).toEqual(false);
    });
  });
});
