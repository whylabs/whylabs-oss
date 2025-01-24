SELECT
    dataset_id,
    name,
    granularity,
    ingestion_disabled,
    type,
    active,
    created_ts,
    last_updated_ts,
    array_agg(
    CASE
        WHEN resource_tags.tag_key IS NOT NULL OR resource_tags.tag_value IS NOT NULL
            THEN json_build_object('key', resource_tags.tag_key, 'value', resource_tags.tag_value)
        END
             ) FILTER (WHERE resource_tags.tag_key IS NOT NULL OR resource_tags.tag_value IS NOT NULL) AS tags
FROM whylabs.datasets
         INNER JOIN whylabs.orgs ON datasets.org_id = orgs.id
         LEFT JOIN whylabs.resource_tags ON datasets.dataset_id = resource_tags.resource_id
WHERE whylabs.orgs.org_id = ?
  AND (datasets.dataset_id = ? or ? IS NULL)
  AND (active = true or active is null or ?)
GROUP BY
    datasets.dataset_id,
    datasets.name,
    datasets.granularity,
    datasets.ingestion_disabled,
    datasets.type,
    datasets.active,
    datasets.created_ts,
    datasets.last_updated_ts;