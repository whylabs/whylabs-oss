
-- replace sequence generator on id column. previous generator went away when whylabs_profiles_v1 table was dropped.
CREATE SEQUENCE whylabs.reference_profiles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- set value of sequence to lowest unused id.
select setval('whylabs.reference_profiles_id_seq', (SELECT MAX(id)+1 FROM whylabs.reference_profiles));

ALTER TABLE whylabs.reference_profiles ALTER COLUMN id SET NOT NULL;
ALTER TABLE whylabs.reference_profiles ALTER COLUMN id SET DEFAULT nextval('whylabs.reference_profiles_id_seq');
ALTER SEQUENCE whylabs.reference_profiles_id_seq OWNED BY whylabs.reference_profiles.id;



