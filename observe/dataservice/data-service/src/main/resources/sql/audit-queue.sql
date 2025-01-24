-- collect full count of profiles in specific states
SELECT n2.state, COALESCE(count, 0) count
from (select state, count(*) count
      from (select state
            from whylabs.profile_upload_audit
            where state='processing' or state='pending'
            ) allrows
      group by state) n1
         RIGHT OUTER  JOIN
     (SELECT state from (values (cast('pending' as audit_state_enum)),
                                (cast('processing' as audit_state_enum))) as states(state)) n2
     ON (n1.state = n2.state)

