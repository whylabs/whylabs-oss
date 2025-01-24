import { Fixed64, IAnyValue } from '@opentelemetry/otlp-transformer';
import { TraceRequestType } from '@opentelemetry/otlp-transformer/build/src/protobuf/serializers';
import { InputJsonObject } from '@prisma/client/runtime/library';

import { Prisma } from '../../generated/client';

const fixed64NanoToMilliseconds = (duration: Fixed64): number => {
  let nanoseconds: number;

  if (typeof duration === 'number') {
    nanoseconds = duration;
  } else if (typeof duration === 'string') {
    nanoseconds = parseInt(duration, 10);
  } else if (typeof duration === 'object' && 'low' in duration && 'high' in duration) {
    // Handle LongBits
    const low = BigInt(duration.low >>> 0) + (BigInt(duration.high) << 32n);
    nanoseconds = Number(low);
  } else {
    throw new Error('Invalid Fixed64 input');
  }

  // Convert nanoseconds to milliseconds
  return Math.floor(nanoseconds / 1_000_000);
};

const uint8ArrayToHexString = (input: string | Uint8Array): string => {
  if (typeof input === 'string') {
    return input;
  }
  return Array.from(input)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const convertAnyValueToScalar = (
  value: IAnyValue,
): string | boolean | number | null | unknown[] | Record<string, unknown> | undefined => {
  if (value.stringValue) return value.stringValue;
  if (value.boolValue) return Boolean(value.boolValue);
  if (value.intValue) return Number(value.intValue);
  if (value.doubleValue) return value.doubleValue;
  if (value.bytesValue) {
    return uint8ArrayToHexString(value.bytesValue);
  }

  if (value.arrayValue) {
    return value.arrayValue.values.map((v) => convertAnyValueToScalar(v));
  }
  if (value.kvlistValue) {
    return value.kvlistValue.values.reduce((acc, cur) => {
      acc[cur.key] = convertAnyValueToScalar(cur.value);
      return acc;
    }, {} as Record<string, unknown>);
  }

  return undefined;
};

// convert the following kotlin code to typescript
const SpecialTagGroups = [
  'whylabs.secure.action',
  'whylabs.secure.additional_data',
  'whylabs.secure.metadata',
  'whylabs.secure.metrics',
  'whylabs.secure.latency',
  'whylabs.secure.score_latency',
  'whylabs.secure.policy',
  'whylabs.secure.score',
];

export const parseSpans = (input: Buffer): Prisma.SpanEntryCreateManyInput[] => {
  const res = TraceRequestType.decode(input);
  const resourceAttributes =
    res.resourceSpans
      ?.map((rs) => rs.resource)
      ?.map((rs) => {
        return (
          rs?.attributes?.reduce((acc, cur) => {
            acc[cur.key] = convertAnyValueToScalar(cur.value);
            return acc;
          }, {} as Record<string, unknown>) ?? {}
        );
      })
      ?.reduce((acc, curr) => {
        for (const [key, value] of Object.entries(curr)) {
          if (!(key in acc)) {
            acc[key] = value;
          }
        }
        return acc;
      }, {} as Record<string, unknown>) ?? {};
  return (
    res.resourceSpans
      ?.flatMap((resourceSpan) => resourceSpan.scopeSpans)
      ?.flatMap((scopeSpan) => scopeSpan.spans)
      ?.map((span) => {
        if (span == null) {
          return null;
        }
        const attributes = span.attributes.reduce((acc, cur) => {
          const specialTag = SpecialTagGroups.find((tagGroup) => {
            cur.key.startsWith(tagGroup + '.');
          });
          if (specialTag) {
            const currentAttrs = (acc[specialTag] ?? {}) as Record<string, unknown>;
            const key = cur.key.replace(specialTag + '.', '');
            currentAttrs[key] = convertAnyValueToScalar(cur.value);
            acc[specialTag] = currentAttrs;
          } else {
            acc[cur.key] = convertAnyValueToScalar(cur.value);
          }
          return acc;
        }, {} as Record<string, unknown>);
        const events = span.events.map((event) => {
          const attrs = event.attributes.reduce((acc, cur) => {
            acc[cur.key] = convertAnyValueToScalar(cur.value);
            return acc;
          }, {} as Record<string, unknown>);
          return {
            name: event.name,
            time: new Date(fixed64NanoToMilliseconds(event.timeUnixNano)),
            attributes: attrs,
          };
        }) as InputJsonObject[];

        const links = span.links.map((link) => {
          const attrs = link.attributes.reduce((acc, cur) => {
            const value = convertAnyValueToScalar(cur.value);
            acc[cur.key] = value;
            if (!value) {
              console.error('Failed to convert value to scalar', cur.value);
            }
            return acc;
          }, {} as Record<string, unknown>);
          return {
            spanId: uint8ArrayToHexString(link.spanId),
            traceId: uint8ArrayToHexString(link.traceId),
            traceState: link.traceState,
            attributes: attrs,
            droppedAttributesCount: link.droppedAttributesCount,
          };
        }) as InputJsonObject[];

        const tags = span.attributes
          .filter((attr) => attr.key === 'whylabs.secure.tags')
          .flatMap((attr) => attr.value.arrayValue?.values ?? [])
          .map((v) => v.stringValue)
          .filter((v) => v !== undefined) as string[];

        // convert span to SpanEntry
        const entry: Prisma.SpanEntryCreateManyInput = {
          org_id:
            (attributes['whylabs.org_id'] as string | undefined) ??
            (attributes['whylabs.orgId'] as string | undefined) ??
            'org-0',
          resource_id:
            (attributes['whylabs.resource_id'] as string | undefined) ??
            (attributes['whylabs.resourceId'] as string | undefined) ??
            'resource-0',
          resource_attributes: resourceAttributes as InputJsonObject,
          trace_id: uint8ArrayToHexString(span.traceId),
          span_id: uint8ArrayToHexString(span.spanId),
          span_name: span.name,
          span_status: span.status?.code?.toString() ?? 'STATUS_CODE_UNSET',
          parent_id: span.parentSpanId ? uint8ArrayToHexString(span.parentSpanId) : null,
          start_timestamp: new Date(fixed64NanoToMilliseconds(span.startTimeUnixNano)),
          end_timestamp: new Date(fixed64NanoToMilliseconds(span.endTimeUnixNano)),
          attributes: attributes as InputJsonObject,
          events: events,
          links: links,
          tags: tags,
          start_timebucket: new Date(new Date(fixed64NanoToMilliseconds(span.startTimeUnixNano)).setMinutes(0, 0, 0)),
        };
        return entry;
      }) //
      ?.filter(
        (entry: Prisma.SpanEntryCreateManyInput | null): entry is Prisma.SpanEntryCreateManyInput => entry !== null,
      ) ?? []
  );
};
