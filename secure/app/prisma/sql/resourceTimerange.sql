SELECT resource_id, min(start_timestamp) as start_ts, max(end_timestamp) as end_ts, min(ingestion_timestamp) as creation_time
from span_entries
group by resource_id;
