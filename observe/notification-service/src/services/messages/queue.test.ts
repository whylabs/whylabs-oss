import { SQS, Message, ReceiveMessageResult } from '@aws-sdk/client-sqs';
import { processMessage } from './queue';
import createSpy = jasmine.createSpy;
import { asyncNoop } from '../../util/test-helpers';

const createSQSMessage = (body: string, id: string, receiptHandle: string): Message => ({
  MessageId: id,
  ReceiptHandle: receiptHandle,
  Body: body,
});

let deleteMessageSpy: jasmine.Spy;

const createMockSQSClient = (body = 'blah', id = 'foo', receiptHandle = 'bar'): Partial<SQS> => ({
  receiveMessage: jest
    .fn()
    .mockResolvedValue({ Messages: [createSQSMessage(body, id, receiptHandle)] } as ReceiveMessageResult),
  deleteMessage: deleteMessageSpy,
});

describe('processMessage', () => {
  beforeEach(() => {
    deleteMessageSpy = createSpy().and.returnValue({ promise: asyncNoop });
  });
  it('should throw if the message contains no body/id/handle', async () => {
    const message = createSQSMessage('', '', '');
    const sqs = createMockSQSClient();
    const test = processMessage(message, asyncNoop, sqs as SQS, '');
    await expect(test).rejects.toThrow(/Received a message with missing parameters/i);
    expect.assertions(1);
  });
  it('should delete message when body is not a JSON object', async () => {
    const message = createSQSMessage('blah', 'id', 'handle');
    const sqs = createMockSQSClient();
    await processMessage(message, asyncNoop, sqs as SQS, '');
    expect(deleteMessageSpy).toHaveBeenCalledTimes(1);
    expect.assertions(1);
  });
  it('should process and remove the message', async () => {
    const message = createSQSMessage(JSON.stringify({}), 'foo', 'bar');
    const handler = createSpy();
    const sqs = createMockSQSClient();
    await processMessage(message, handler, sqs as SQS, '');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(deleteMessageSpy).toHaveBeenCalledTimes(1);
    expect.assertions(2);
  });
});
