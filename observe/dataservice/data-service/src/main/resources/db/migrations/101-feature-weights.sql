CREATE TABLE IF NOT EXISTS whylabs.feature_weights (
    id BIGSERIAL PRIMARY KEY,
    org_id TEXT,
    dataset_id TEXT,
    version INTEGER,
    author TEXT,
    updated_timestamp timestamptz,
    UNIQUE (org_id, dataset_id)
);


CREATE TABLE IF NOT EXISTS whylabs.feature_weight_details (
                                                              feature_weight_id BIGINT,
                                                              segment TEXT,
                                                              weights JSONB,
                                                              PRIMARY KEY (feature_weight_id, segment),
                                                              FOREIGN KEY (feature_weight_id) REFERENCES whylabs.feature_weights(id)
    ON DELETE CASCADE
);
