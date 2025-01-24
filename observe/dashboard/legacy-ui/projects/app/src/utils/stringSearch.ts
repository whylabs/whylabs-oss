export function passesSearchFilter(data: string, search?: string): boolean {
  return !search || data.toLowerCase().includes(search.toLowerCase());
}
