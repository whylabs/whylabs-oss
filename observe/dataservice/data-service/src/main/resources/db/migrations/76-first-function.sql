
-- Create a function that always returns the first non-NULL value:
CREATE OR REPLACE FUNCTION whylabs.first_agg (anyelement, anyelement)
    RETURNS anyelement
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS
'SELECT $1';

-- Then wrap an aggregate around it:
CREATE OR REPLACE AGGREGATE whylabs.first (anyelement) (
    SFUNC    = whylabs.first_agg,
    STYPE    = anyelement,
    PARALLEL = safe
    );
