export interface ColumnCardContentProps {
  isPhaseActive: boolean;
  setContentHeight: (n: number) => void;
  setWidthSpan: React.Dispatch<React.SetStateAction<number>>;
  editMode: boolean;
  setHasChanged: Dispatch<SetStateAction<boolean>>;
}

export type PhaseCard = {
  content: (props: ColumnCardContentProps) => JSX.Element;
  readonly span: number;
  id: string | number;
};
