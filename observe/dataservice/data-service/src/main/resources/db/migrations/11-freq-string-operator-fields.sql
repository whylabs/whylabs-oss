CREATE TYPE frequent_string_comparison_operator_enum AS ENUM ('eq', 'target_includes_all_baseline', 'baseline_includes_all_target');
alter table whylabs.whylogs_analyzer_results add column frequent_string_comparison_operator frequent_string_comparison_operator_enum;
alter table whylabs.whylogs_analyzer_results add column frequent_string_comparison_sample text[];
