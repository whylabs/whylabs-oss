import { Colors, chartColorForIndex, getLLMSecureColor } from './Colors';

describe('Colors', () => {
  describe('chartColorForIndex', () => {
    it('should first return colors from Colors.chartColorArray', () => {
      Colors.chartColorArray.forEach((color, index) => {
        expect(chartColorForIndex(index)).toEqual(color);
      });
    });

    it.each([
      ['#3db814', 6],
      ['#1b14b8', 7],
      ['#b84b14', 8],
      ['#14b87b', 9],
      ['#aa14b8', 10],
      ['#95b814', 11],
      ['#1466b8', 12],
      ['#b81436', 13],
      ['#14b822', 14],
      ['#5214b8', 15],
      ['#b88214', 16],
      ['#14b8b1', 17],
      ['#b8148e', 18],
      ['#5fb814', 19],
      ['#142fb8', 20],
    ])('should return %p for index %p', (expected, index) => {
      const result = chartColorForIndex(index);
      expect(result).toEqual(expected);
    });
  });

  describe('getLLMSecureColor', () => {
    it.each([
      ['#F07028', 'bad_actor'],
      ['#D11010', 'block'],
      ['#2683C9', 'cost'],
      ['#005566', 'customer_experience'],
      ['#F07028', 'flag'],
      ['#00C7F3', 'hallucination'],
      ['#F07028', 'injection'],
      ['#A25320', 'input'],
      ['#D11010', 'misuse'],
      ['#A25320', 'output'],
      ['#AA0000', 'pii'],
      ['#E029CA', 'proactive_injection_detection'],
      ['#E029CA', 'proactive injection detection'],
      ['#0E7384', 'refusal'],
      ['#D11010', 'regex'],
      ['#636D6F', 'secure'],
      ['#2683C9', 'text_stat'],
      ['#2683C9', 'text stat'],
      ['#670057', 'theme'],
      ['#2962BD', 'topic'],
      ['#005566', 'toxicity'],
      ['#00C7F3', 'truthfulness'],
    ])('should return %p for %p', (expected, context) => {
      const result = getLLMSecureColor(context);
      expect(result).toEqual(expected);
    });

    it.each(['', 'unknown', null, undefined])(
      'should return default color for invalid context %p',
      (invalidContext) => {
        // @ts-expect-error - forcing invalid context for test
        const result = getLLMSecureColor(invalidContext);
        expect(result).toEqual('#636D6F');
      },
    );
  });
});
