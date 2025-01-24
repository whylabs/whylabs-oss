import ReactJson from 'react-json-view';

type JsonViewerProps = {
  src: object;
};

export const JsonViewer = ({ src }: JsonViewerProps): JSX.Element => {
  return (
    <ReactJson
      // @ts-expect-error - This is a valid prop documented at https://www.npmjs.com/package/react-json-view but is missing on TS definitions
      displayArrayKey={false}
      displayDataTypes={false}
      displayObjectSize={false}
      name={false}
      src={src}
      collapseStringsAfterLength={80}
      style={{
        wordBreak: 'break-all',
      }}
    />
  );
};
