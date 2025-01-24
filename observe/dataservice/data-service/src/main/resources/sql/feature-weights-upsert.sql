INSERT INTO whylabs.feature_weights (org_id, dataset_id, version, author, updated_timestamp) values (?, ?, ?, ?, ?)
ON CONFLICT (org_id, dataset_id) DO UPDATE SET
                                               version = GREATEST(feature_weights.version + 1, excluded.version),
                                               author = COALESCE(excluded.author, feature_weights.author),
                                               updated_timestamp = COALESCE(excluded.updated_timestamp, feature_weights.updated_timestamp)
RETURNING id;
