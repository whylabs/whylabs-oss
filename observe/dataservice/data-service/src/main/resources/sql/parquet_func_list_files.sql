create or replace function list_parquet_files(args jsonb)
    returns text[] as
$$
begin
    return array_agg(args->>'dir' || '/' || filename)
        from pg_ls_dir(args->>'dir') as files(filename)
           where filename ~~ '%.parquet';
end
$$
    language plpgsql;
