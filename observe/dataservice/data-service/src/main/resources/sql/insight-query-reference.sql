WITH parameters (orgId, datasetId, referenceProfileId, tags) as (
--     values('org-hP8eYQ', 'model-1', 'ref-Bb262YE3KxynE1mJ', CAST('{}' as text[]))
    values (:orgId,
            :datasetId,
			:referenceProfileId,
            CAST(:tags as text[]))
),
     OVERALL AS
         (SELECT COLUMN_NAME,
                 SUM(CASE METRIC_PATH
                         WHEN 'counts/n' THEN N_SUM
                         ELSE 0
                     END) AS COUNTS_TOTAL,
                 SUM(CASE METRIC_PATH
                         WHEN 'counts/null' THEN N_SUM
                         ELSE 0
                     END) AS COUNTS_NULL,
                 SUM(CASE METRIC_PATH
                         WHEN 'types/boolean' THEN N_SUM
                         ELSE 0
                     END) AS TYPES_BOOLEAN,
                 SUM(CASE METRIC_PATH
                         WHEN 'types/fractional' THEN N_SUM
                         ELSE 0
                     END) AS TYPES_FRACTIONAL,
                 SUM(CASE METRIC_PATH
                         WHEN 'types/integral' THEN N_SUM
                         ELSE 0
                     END) AS TYPES_INTEGRAL,
                 SUM(CASE METRIC_PATH
                         WHEN 'types/object' THEN N_SUM
                         ELSE 0
                     END) AS TYPES_OBJECT,
                 SUM(CASE METRIC_PATH
                         WHEN 'types/tensor' THEN N_SUM
                         ELSE 0
                     END) AS TYPES_TENSOR,
                 WHYLABS.VARIANCE_TRACKER(VARIANCE) AS VARIANCE,
                 KLL_DOUBLE_SKETCH_MERGE(CASE METRIC_PATH
                                             WHEN 'distribution/kll' THEN KLL
                                             ELSE NULL
                     END, 1024) AS KLL,
                 FREQUENT_STRINGS_SKETCH_MERGE(8,

                                               CASE
                                                   WHEN LENGTH(CAST(FREQUENT_ITEMS AS BYTEA)) > 8 THEN FREQUENT_ITEMS
                                                   END) AS FREQUENT_ITEMS,
                 HLL_SKETCH_UNION(HLL) AS HLL
          FROM WHYLABS.REFERENCE_PROFILES INNER JOIN parameters as p
                                                     ON ORG_ID = p.orgId
                                                         AND DATASET_ID = p.datasetId
                                                         AND REFERENCE_PROFILE_ID = p.referenceProfileId
                                                         AND ((p.tags = CAST('{}' as text[])) OR (segment_text ?& p.tags))
          GROUP BY COLUMN_NAME),
     FREQ AS
         (SELECT COLUMN_NAME,
                 FREQUENT_STRINGS_SKETCH_RESULT_NO_FALSE_POSITIVES(FREQUENT_ITEMS) AS ITEMS
          FROM OVERALL),
     TOP_FREQ AS
         (SELECT COLUMN_NAME,
                 STR      AS MOST_FREQ_VALUE,
                 ESTIMATE AS MOST_FREQ_ESTIMATE,
                 PATTERN_COUNT
          FROM (SELECT COLUMN_NAME,
                       (ITEMS).*,
                       count(*) OVER (PARTITION BY COLUMN_NAME) AS PATTERN_COUNT,
                       ROW_NUMBER() OVER (PARTITION BY COLUMN_NAME
                           ORDER BY COLUMN_NAME) AS ROW_NUMBER
                FROM FREQ) AS T
          WHERE ROW_NUMBER = 1),
     AGG AS
         (SELECT COLUMN_NAME,
                 round(VARIANCE[3], 6)   AS MEAN,
                 COUNTS_TOTAL,
                 COUNTS_NULL,
                 TYPES_BOOLEAN,
                 TYPES_FRACTIONAL,
                 TYPES_INTEGRAL,
                 TYPES_TENSOR,
                 TYPES_OBJECT,
                 KLL_DOUBLE_SKETCH_GET_QUANTILE(KLL,
                                                0) AS MIN_VALUE,
                 KLL_DOUBLE_SKETCH_GET_QUANTILE(KLL,
                                                1) AS MAX_VALUE,
                 HLL_SKETCH_GET_ESTIMATE(HLL)      AS UNIQUENESS
          FROM OVERALL),
     METRICS_UNCLASSIFIED AS
         (SELECT *
          FROM TOP_FREQ
                   JOIN AGG USING (COLUMN_NAME)),
     METRICS AS
         (SELECT ${CATEGORY_CLAUSES},
                 *
          FROM METRICS_UNCLASSIFIED),
     INSIGHTS AS (SELECT COLUMN_NAME,
                         ${INSIGHT_CLAUSES},
                         TO_JSON(METRICS) AS METRIC_JSON
                  FROM METRICS),
--     Add row number so we can do pagination if needed
     RESULTS AS (SELECT ROW_NUMBER() OVER () AS ID, TO_JSON(INSIGHTS) AS ENTRY
                 FROM INSIGHTS
                 WHERE ${HAS_INSIGHT_CLAUSE})
-- Do not change the format of the line. We replace this string for counting the insights
SELECT * FROM RESULTS;