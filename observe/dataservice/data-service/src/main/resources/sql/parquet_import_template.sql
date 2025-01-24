select import_parquet(
               '$TABLE',
               '$SCHEMA',
               'parquet_srv',
               'list_parquet_files',
               '{"dir": "$PATH"}',
               '{"use_mmap": "true", "use_threads": "true"}'
           )