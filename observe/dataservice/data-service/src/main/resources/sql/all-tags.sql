select t1.tag_key,
    array_agg(tag_value)
from whylabs.tags t1
where t1.org_id = :orgId and t1.dataset_id = :datasetId and t1.tag_key is not null and t1.tag_key != ''
group by t1.tag_key
order by t1.tag_key
limit :limit offset :offset
;
