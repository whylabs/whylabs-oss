INSERT INTO whylabs.feature_weight_details (feature_weight_id, segment, weights) VALUES (?, ?, ?)
ON CONFLICT (feature_weight_id, segment) DO UPDATE SET
    weights = excluded.weights
RETURNING feature_weight_id;