-- Early 2022 analysis from prior to having an analyzer_id on every analyzer, this col can be null. Dropping
-- what would otherwise be a healthy constraint check so we don't have a data gap vs druid. For an example
-- SELECT * FROM "whylogs-whylabs-analyzer-results-v3" where  "id" = '5b3e77cb-c41b-3ffd-ab55-71ebac69be9f'

ALTER TABLE whylabs.analysis_anomalies ALTER COLUMN analyzer_id DROP NOT NULL;
