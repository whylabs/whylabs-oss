SELECT min(start_timestamp) as start_ts, max(start_timestamp) as end_ts, min(ingestion_timestamp) as creation_time
from span_entries
where resource_id = $1;
