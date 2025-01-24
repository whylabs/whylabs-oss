-- Already in prod
CREATE INDEX IF NOT EXISTS profiles_hypertable_segmented_json  ON whylabs.profiles_segmented_hypertable USING gin (org_id, dataset_id, segment_text , column_name); -- WITH (timescaledb.transaction_per_chunk) ;
CREATE INDEX IF NOT EXISTS profiles_hypertable_segmented_staging_json  ON whylabs.profiles_segmented_staging USING gin (org_id, dataset_id, segment_text , column_name); -- WITH (timescaledb.transaction_per_chunk) ;

-- TODO: Shift re-order policy and drop the old gin index
--SELECT remove_reorder_policy('whylabs.profiles_segmented_hypertable', if_exists => true);
--SELECT add_reorder_policy('whylabs.profiles_segmented_hypertable', 'profiles_hypertable_segmented_json');
-- drop index if exists profiles_hypertable_segmented_org_dataset_col_seg_idx;

-- Tags table gets a lot of churn on a small number of rows. Being a small table fillfactor
-- tells PG to leave some extra room in each tuple so that a HOT update (one which skips updating any indicies
-- thus making it faster) can append to an existing tuple. TLDR; trade disk space for faster updates. This
-- will 5x the table size of tags but its tiny to begin with.
ALTER TABLE whylabs.tags SET (fillfactor = 20);

