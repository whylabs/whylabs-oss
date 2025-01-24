import { EmbeddingType } from '@whylabs/data-service-node-client';
import { expect } from 'chai';

import { parseTraceNearestNeighbors } from '../llmTraceUtils';

const secureMetricsMock = {
  'whylabs.secure.metrics': {
    'prompt.topics.medical': 0.9915269613265992,
    'prompt.similarity.injection': 0.6848230191639492,
    'prompt.similarity.injection_neighbor_ids':
      '["7aYCZm", "-Ki4iq", "BHzhSG", "u1Ow8Q", "jehCtF", "1732Ov", "Gh2-bm", "CgEMZc", "ZC0JIY", "kVeTbV", "gwHwgL", "Z0lWUB", "Mdxvop", "dbgxQ0"]',
    'prompt.similarity.injection_neighbor_coordinates':
      '[[-0.5545150325891082, -0.15464509167479706, 0.20664567274986145], [-0.5539265685699165, -0.16600699459740836, 0.22616293703543355], [-0.5370280279781776, -0.13325750872313324, 0.2197295962535133], [-0.5048793773321691, -0.21001447606072343, 0.39586037949372355], [-0.5207386227427202, -0.23163879567107348, 0.4225673735165808], [-0.46896521559167403, -0.08407344148523248, 0.3157931204975041], [-0.49804211912235186, -0.20593645505913483, 0.3416431564906902], [-0.5377269853330302, -0.18883806702398453, 0.3484464748686835], [-0.49773273070602775, -0.19347189000601614, 0.380937146143553], [-0.4772965419308912, -0.19820051094614066, 0.36067787833849707], [-0.4617417150173, -0.07488885145113044, 0.30621460105400966], [-0.5038349324469698, -0.20088741403613625, 0.35316601885648113], [-0.5157281854790177, -0.24424310233668797, 0.3644744267688004], [-0.4698046125416533, -0.22188374839921046, 0.3141956458329692]]',
    'prompt.pca.coordinates': '[-0.2359473908022331, 0.06752941432310067, 0.06793844900860743]',
    id: '02544ca1df477b45e85848e21adfa4f32815954d4f8f6194d12b9c28511583c8',
    'prompt.similarity.jailbreak': 0.41634935140609747,
    'prompt.sentiment.sentiment_score': -0.3612,
    'prompt.pii.phone_number': 0,
    'prompt.pii.email_address': 0,
    'prompt.pii.credit_card': 0,
    'prompt.pii.us_ssn': 0,
    'prompt.pii.us_bank_number': 0,
    'prompt.stats.char_count': 42,
    'prompt.stats.token_count': 8,
    'response.similarity.test_dataset_neighbor_ids': '["7aYCZm", "-Ki4iq", "BHzhSG"]',
    'response.similarity.test_dataset_neighbor_coordinates':
      '[[-0.111, -0.112, 0.113], [-0.122, -0.123, 0.124], [-0.133, -0.134, 0.135]]',
  },
};

describe('testing llmTraceUtils', function () {
  it('Should return empty with invalid neighbors data (divergent number of elements between IDs and coordinates', function () {
    expect(
      parseTraceNearestNeighbors(
        {
          'whylabs.secure.metrics': {
            ...secureMetricsMock['whylabs.secure.metrics'],
            'prompt.similarity.injection_neighbor_ids': ['id1', 'id2'],
          },
        },
        EmbeddingType.Prompt,
      ),
    ).to.deep.eq([]);
  });

  it('Should parse metrics to get prompt neighbors data', function () {
    expect(parseTraceNearestNeighbors(secureMetricsMock, EmbeddingType.Prompt)).to.deep.eq([
      expectedPromptNeighborParsed,
    ]);
  });

  it('Should parse metrics to get response neighbors data', function () {
    expect(parseTraceNearestNeighbors(secureMetricsMock, EmbeddingType.Response)).to.deep.eq([
      expectedResponseNeighborParsed,
    ]);
  });

  it('Should parse metrics to get prompt and response neighbors data', function () {
    expect(parseTraceNearestNeighbors(secureMetricsMock)).to.deep.eq([
      expectedPromptNeighborParsed,
      expectedResponseNeighborParsed,
    ]);
  });
});

const expectedPromptNeighborParsed = {
  dataset: 'injection',
  type: 'prompt',
  x: [
    -0.5545150325891082, -0.5539265685699165, -0.5370280279781776, -0.5048793773321691, -0.5207386227427202,
    -0.46896521559167403, -0.49804211912235186, -0.5377269853330302, -0.49773273070602775, -0.4772965419308912,
    -0.4617417150173, -0.5038349324469698, -0.5157281854790177, -0.4698046125416533,
  ],
  y: [
    -0.15464509167479706, -0.16600699459740836, -0.13325750872313324, -0.21001447606072343, -0.23163879567107348,
    -0.08407344148523248, -0.20593645505913483, -0.18883806702398453, -0.19347189000601614, -0.19820051094614066,
    -0.07488885145113044, -0.20088741403613625, -0.24424310233668797, -0.22188374839921046,
  ],
  z: [
    0.20664567274986145, 0.22616293703543355, 0.2197295962535133, 0.39586037949372355, 0.4225673735165808,
    0.3157931204975041, 0.3416431564906902, 0.3484464748686835, 0.380937146143553, 0.36067787833849707,
    0.30621460105400966, 0.35316601885648113, 0.3644744267688004, 0.3141956458329692,
  ],
  id: [
    '7aYCZm',
    '-Ki4iq',
    'BHzhSG',
    'u1Ow8Q',
    'jehCtF',
    '1732Ov',
    'Gh2-bm',
    'CgEMZc',
    'ZC0JIY',
    'kVeTbV',
    'gwHwgL',
    'Z0lWUB',
    'Mdxvop',
    'dbgxQ0',
  ],
};

const expectedResponseNeighborParsed = {
  dataset: 'test_dataset',
  type: 'response',
  x: [-0.111, -0.122, -0.133],
  y: [-0.112, -0.123, -0.134],
  z: [0.113, 0.124, 0.135],
  id: ['7aYCZm', '-Ki4iq', 'BHzhSG'],
};
