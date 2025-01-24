import { Colors } from '@whylabs/observatory-lib';

export function setHighlightedText(text: string, highlight: string): string | (string | JSX.Element)[] {
  if (!highlight) return text;

  // Split text on highlight term, include term itself into parts, ignore case
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));

  return parts.map((part, i) =>
    part.toLowerCase() === highlight.toLowerCase() ? (
      // eslint-disable-next-line
      <span key={`${part}-${i}`} style={{ backgroundColor: Colors.brandPrimary100 }}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}
