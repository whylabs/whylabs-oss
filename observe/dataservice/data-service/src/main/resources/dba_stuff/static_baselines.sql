-- extract analyzers with static ranges
SELECT json_conf ->> 'orgId'                                    AS orgId,
       json_conf ->> 'datasetId'                                AS datasetId,
       monitor ->> 'id'                                         AS monitorId,
       monitor ->> 'displayName'                                AS displayName,
       analyzer ->> 'id'                                        AS analyzerId,
       analyzer -> 'config' -> 'baseline' -> 'range' -> 'start' AS start,
       analyzer -> 'config' -> 'baseline' -> 'range' -> 'end'   AS end
FROM (
    -- postgres stores all versions of monitor configs
    -- get the latest version
    SELECT DISTINCT ON (org_id, dataset_id) *
      FROM whylabs.monitor_config,
           LATERAL jsonb_path_query(json_conf, '$.metadata.version') AS version
      order by org_id, dataset_id, version desc) t1,

    -- use lateral self-joins to explode analyzerIds and pluck out the corresponding analyzer
     LATERAL jsonb_array_elements(json_conf -> 'monitors') AS monitor,
     LATERAL jsonb_array_elements_text(monitor -> 'analyzerIds') AS analyzerId,
     LATERAL jsonb_array_elements(json_conf -> 'analyzers') AS analyzers,
     LATERAL jsonb_build_array(jsonb_build_object('id', analyzerId, 'analyzers', analyzers)) AS obj,
     LATERAL jsonb_path_query(obj, '$.analyzers[*] ? (@.id == $.id)') AS analyzer
where analyzer -> 'config' -> 'baseline' -> 'range' is not null;