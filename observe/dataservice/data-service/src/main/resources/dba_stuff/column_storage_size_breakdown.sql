--- How much space do these columns take up in the table

select
    sum(pg_column_size(id)) as id_total_size,
    avg(pg_column_size(id)) as id_average_size,

    sum(pg_column_size(org_id)) as org_id_total_size,
    avg(pg_column_size(org_id)) as id_average_size,

    sum(pg_column_size(hll)) as hll_total_size,
    avg(pg_column_size(hll)) as hll_average_size,

    sum(pg_column_size(kll)) as kll_total_size,
    avg(pg_column_size(kll)) as kll_average_size,

    sum(pg_column_size(dataset_timestamp)) as dataset_timestamp_total_size,
    avg(pg_column_size(dataset_timestamp)) as dataset_timestamp_average_size

from whylabs.profiles_segmented_hypertable;

