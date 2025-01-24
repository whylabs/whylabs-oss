import HCPlaceholder from 'hcplaceholder';

/**
 * Retrieves a HCPlaceholder chart by its ID.
 *
 * @param idToSearch - The ID of the chart to search for.
 * @returns The chart with the specified ID, or undefined if not found.
 */
export const getChartById = (idToSearch: string) => {
  // HCPlaceholder is a global namespace in which all rendered charts lives.
  return HCPlaceholder?.charts?.find((c) => {
    if (!c?.userOptions) return false;
    return 'id' in c.userOptions && idToSearch === c.userOptions.id;
  });
};
