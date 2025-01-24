-- return names of features with active metrics within range
SELECT DISTINCT ON (column_name) column_name
FROM whylabs.reference_profiles
WHERE org_id = :orgId
  AND dataset_id = :datasetId
  AND reference_profile_id = :referenceProfileId
  AND (
        (:segmentTags = CAST('{}' as text[]))
        OR
        (segment_text ?& CAST(:segmentTags as text[])))
  AND metric_path = 'counts/n';
