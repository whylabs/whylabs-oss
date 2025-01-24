-- collect count of profiles in each state over recent interval
SELECT n2.state, COALESCE(count, 0) count
FROM (select state, count(*) count
      from  whylabs.profile_upload_audit
      where last_updated_ts > now() - INTERVAL '1 min'
      group by state) n1
         RIGHT OUTER  JOIN
     (SELECT unnest(enum_range(cast(NULL as audit_state_enum))) state) n2
     ON (n1.state = n2.state)