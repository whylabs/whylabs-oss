import { KnownBlock, MrkdwnElement } from '@slack/types';

export interface InfoItem {
  title: string;
  info: string;
}

export const generateOneRowItem = (title: string, data: string): string => {
  return `*${title}:* ${data} \n`;
};

export const generateInfoColumn = (items: InfoItem[]): MrkdwnElement => {
  const data = items.map((item) => {
    return generateOneRowItem(item.title, item.info);
  });

  return {
    type: 'mrkdwn',
    text: data.join(''),
  };
};

export const generateRow = (firstColumnData: InfoItem[], secondColumnData?: InfoItem[]): KnownBlock => {
  if (secondColumnData?.length) {
    return {
      type: 'section',
      fields: [generateInfoColumn(firstColumnData), generateInfoColumn(secondColumnData)],
    };
  }
  return {
    type: 'section',
    text: generateInfoColumn(firstColumnData),
  };
};

export const generateMessage = (message: string): KnownBlock => {
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*Message*: \n ${message}`,
    },
  };
};
