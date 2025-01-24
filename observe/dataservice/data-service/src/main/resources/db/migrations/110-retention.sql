-- Turns out bad practice to query the entire table as the retention policies take access eclusive locks
-- and those locks aren't as narrowly scoped as one might think. The change here is bumping the retention period
-- on the table out to a week and filtering down to 2D at query time so that we're never accessing a
-- chunk that's getting purged by a retention policy.

SELECT remove_retention_policy('whylabs.dataset_statistics_rollup_2d', if_exists => true);
SELECT add_retention_policy('whylabs.dataset_statistics_rollup_2d', INTERVAL '7 days', if_not_exists => TRUE);

CREATE OR REPLACE FUNCTION initiateBronzeToSilverDataPromotions() RETURNS boolean AS $$
BEGIN
    if (select status from whylabs.global_system limit 1) = ('data_promotion_silver_to_historical') THEN
        -- Reduce row lock contention by pausing bronze=>silver promotions until silver=>historical have finished. Yes
        -- inserts can have seemingly unrelated contention with deletes because tuples share blocks, btree splits, etc.
        return false;
    end if;

    -- Queue up data promotions for all datasets which have had a recent upload
    with fresh_data as (SELECT org_id, dataset_id FROM "whylabs"."dataset_statistics_rollup_2d" where bucket > NOW() - INTERVAL '2 DAY' group by org_id, dataset_id),
         a as (insert into whylabs.queue_data_promotions_bronze_to_silver (org_id, dataset_id) select org_id, dataset_id from fresh_data ON CONFLICT (org_id, dataset_id) DO NOTHING )
    insert into whylabs.queue_data_promotions_silver_to_historical (org_id, dataset_id) select org_id, dataset_id from fresh_data ON CONFLICT (org_id, dataset_id) DO NOTHING
    ;
    return true;
END;
$$ LANGUAGE plpgsql;
