export function handleKeyPress(
  subAction: (event: React.KeyboardEvent) => void,
): (event: React.KeyboardEvent<HTMLElement>) => void {
  return (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === ' ' || event.key === 'Enter') {
      subAction(event);
    }
  };
}
