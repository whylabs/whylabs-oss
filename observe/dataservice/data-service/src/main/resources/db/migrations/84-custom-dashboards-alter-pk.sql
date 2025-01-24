ALTER TABLE whylabs.custom_dashboards DROP CONSTRAINT custom_dashboards_pkey;
ALTER TABLE whylabs.custom_dashboards ALTER COLUMN id TYPE text;
ALTER TABLE whylabs.custom_dashboards ADD CONSTRAINT custom_dashboards_pkey PRIMARY KEY (id, org_id);

