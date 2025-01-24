/*
 * Map used to know which datasets we need to search for neighbors when clicking in a violation tag
 */
export const mapViolationTagsToNeighborsDatasets = new Map<string, string[]>([
  ['prompt.score.bad_actors', ['injection']],
  ['response.score.bad_actors', ['injection']],
]);
