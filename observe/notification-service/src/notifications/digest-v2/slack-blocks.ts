import { ImageBlock, KnownBlock } from '@slack/types';

export class SlackBlocksUI {
  static generateDivider(): KnownBlock {
    return {
      type: 'divider',
    };
  }

  static generateSection(text: string, textType: 'plain_text' | 'mrkdwn' = 'plain_text'): KnownBlock {
    return this.generateBlock(text, 'section', textType);
  }

  static generateHeader(text: string, textType: 'plain_text' | 'mrkdwn' = 'mrkdwn'): KnownBlock {
    return this.generateBlock(text, 'header', textType);
  }

  static generateBlock(
    text: string,
    blockType: 'section' | 'header' = 'section',
    textType: 'plain_text' | 'mrkdwn' = 'plain_text',
  ): KnownBlock {
    switch (textType) {
      case 'mrkdwn':
        return {
          type: 'section',
          text: {
            type: textType,
            text: text,
          },
        };
      case 'plain_text':
        return {
          type: 'section',
          text: {
            type: textType,
            text: text,
            emoji: true,
          },
        };
    }
  }

  static generateFooter(
    datasetText: string,
    datasetUrl: string,
    monitorUrl: string,
    notificationUrl: string,
  ): KnownBlock {
    return {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: datasetText,
            emoji: true,
          },
          url: datasetUrl,
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Monitor Manager',
            emoji: true,
          },
          url: monitorUrl,
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Notification Settings',
            emoji: true,
          },
          url: notificationUrl,
        },
      ],
    };
  }

  static generateImageBlock(imageUrl: string, blockId?: string, altText?: string): ImageBlock {
    return {
      type: 'image',
      image_url: imageUrl,
      alt_text: altText ?? '',
    };
  }
}
