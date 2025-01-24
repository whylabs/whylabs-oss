# Tracing set up in Azure

### EventHubs

We use EventHubs to receive traces from the application

### Azure Data Explorer

We set up ingestion from EventHubs to Azure Data Explorer (ADX) to store the traces.

Here's what the table schema and the ingestion mapping looks like (note that this is **KQL** and not SQL):

```sql
// Create table command
////////////////////////////////////////////////////////////
.create table ['traces']  (['OrgId']:string, ['ResourceId']:string, ['TraceId']:string, ['SpanId']:string, ['ParentId']:string, ['SpanName']:string, ['SpanStatus']:string, ['SpanStatusMessage']:string, ['SpanKind']:string, ['StartTime']:datetime, ['EndTime']:datetime, ['ResourceAttributes']:dynamic, ['TraceAttributes']:dynamic, ['Events']:dynamic, ['Links']:dynamic, ['Tags']:dynamic)

// Create mapping command
////////////////////////////////////////////////////////////
.create table ['traces'] ingestion json mapping 'traces_mapping' '[{"column":"OrgId", "Properties":{"Path":"$[\'OrgId\']"}},{"column":"ResourceId", "Properties":{"Path":"$[\'ResourceId\']"}},{"column":"TraceId", "Properties":{"Path":"$[\'TraceId\']"}},{"column":"SpanId", "Properties":{"Path":"$[\'SpanId\']"}},{"column":"ParentId", "Properties":{"Path":"$[\'ParentId\']"}},{"column":"SpanName", "Properties":{"Path":"$[\'SpanName\']"}},{"column":"SpanStatus", "Properties":{"Path":"$[\'SpanStatus\']"}},{"column":"SpanStatusMessage", "Properties":{"Path":"$[\'SpanStatusMessage\']"}},{"column":"SpanKind", "Properties":{"Path":"$[\'SpanKind\']"}},{"column":"StartTime", "Properties":{"Path":"$[\'StartTime\']","transform":"DateTimeFromUnixNanoseconds"}},{"column":"EndTime", "Properties":{"Path":"$[\'EndTime\']","transform":"DateTimeFromUnixNanoseconds"}},{"column":"ResourceAttributes", "Properties":{"Path":"$[\'ResourceAttributes\']"}},{"column":"TraceAttributes", "Properties":{"Path":"$[\'TraceAttributes\']"}},{"column":"Events", "Properties":{"Path":"$[\'Events\']"}},{"column":"Links", "Properties":{"Path":"$[\'Links\']"}},{"column":"Tags", "Properties":{"Path":"$[\'Tags\']"}}]'
```

### Querying + other optimizations

Probably keep in data service side. Songbird focuses on emitting events into EventHubs.