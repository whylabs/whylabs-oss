
/* These enums should mirror the java pojo values 1:1 */
CREATE TYPE granularity_enum AS ENUM ('HOURS', 'DAYS', 'WEEKS', 'MONTHS');
CREATE TYPE target_level_enum AS ENUM ('column', 'dataset');
CREATE TYPE diff_mode_enum AS ENUM ('abs', 'pct');
CREATE TYPE threshold_type_enum AS ENUM ('upper', 'lower');
CREATE TYPE column_list_mode_enum AS ENUM ('ON_ADD_AND_REMOVE', 'ON_ADD', 'ON_REMOVE');


-- Define the functions necessary for using our Variance Tracker triplets into aggretable or
-- calculable values.

-- Aggregate Variance Tracker {count, sum, mean} together.  Given two such vectors, combine their
-- values together, maintaining those definitions.
create or replace function whylabs.agg_variance_tracker_acc(this decimal[3], other decimal[3])
    -- Values and their indexes are stored Count (1), Sum (2), Mean (3)
    -- Copied from the Java code https://github.com/whylabs/whylogs-java/blob/mainline/core/src/main/java/com/whylogs/core/statistics/datatypes/VarianceTracker.java
    returns decimal[3]
as
$BODY$
DECLARE
    delta decimal;
    total_count decimal;
    this_ratio decimal;
    other_ratio decimal;
    result decimal[3];
BEGIN
    if other is null then
        -- because of the INITCOND (defined below), we'll always have a value of {0,0,0} running around during an aggregation
        -- This means that that if we aggregate a null value, we end up with {0,0,0} - conjuring the variane tracker
        -- out of thin air.  However, this tracks with what we were during in Java, as we create the initial
        -- VarianceTracker with 0s and then update those values...
        return this;
    end if;

    -- This seems wrong, but is how we did in the Java VarianceTracker
    if this[1] = 0 then
        return other;
    end if;

    delta := this[3] - other[3];
    total_count := this[1] + other[1];

    -- this.sum += other.sum + Math.pow(delta, 2) * this.count * other.count / (double) totalCount;
    result[2] := this[2] + other[2] + (delta * delta) * (this[1] * other[1]) / total_count;

    this_ratio := this[1] / total_count;
    other_ratio := 1.0 - this_ratio;

    result[3] = this[3] * this_ratio + other[3] * other_ratio;
    result[1] = this[1] + other[1];

    RETURN result;

END
$BODY$
    LANGUAGE plpgsql;

-- Final state of the aggregation. Because we keep the count, sum and mean coherent after each call to the
-- accumulate function, all we have to do is return the final value.
create or replace function whylabs.agg_variance_tracker_final(accumulated decimal[3])
    returns decimal[3]
as
$BODY$
BEGIN
    return accumulated;
END
$BODY$
    LANGUAGE plpgsql ;

-- Tie together the accumulate and final state function so that we can call them within a group-by statement
-- Ex.
-- create table variance_example (
--     id serial primary key,
--     block numeric,
--     variance decimal[3]
-- );
--
-- insert into variance_example (block, variance)
-- values
-- (1, null),
-- (2, ARRAY[1.0, 2.0, 3.0]),
-- (2, ARRAY[5.6, 3.2, 9.2]),
-- (3, ARRAY[0, 3.2, 99]),
-- (4, null),
-- (4, ARRAY[22, 13.4, 7]),
-- (5, ARRAY[31, 22, 1]),
-- (5, null),
-- (6, null),
-- (6, null)
-- ;
--
-- select block, variance_tracker(variance)
-- from variance_example
-- group by block
-- order by block;
create or replace aggregate whylabs.variance_tracker(decimal[3])
(
    INITCOND = '{0, 0, 0}',
    -- TODO: Check out COMBINEFUNC (https://www.postgresql.org/docs/current/sql-createaggregate.html#SQL-CREATEAGGREGATE-NOTES)
    -- Could give perf gains
    STYPE = decimal[3],
    SFUNC = whylabs.agg_variance_tracker_acc,
    FINALFUNC = whylabs.agg_variance_tracker_final
);

-- Convert our Variance Tracker-encoded values into a regular variance
create or replace function whylabs.variance(decimal[3])
    returns decimal
as

'select CASE
            WHEN $1[1] = 0 THEN ''NaN''::NUMERIC
            WHEN $1[1] = 1 THEN 0
            ELSE
                    $1[2] / ($1[1] - 1)
            END;'
    LANGUAGE sql
    immutable
    leakproof
    returns null on null input;


