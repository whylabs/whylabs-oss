from demo_setup import demo_org_id, demo_dataset_id, ref_df, ref_dataset_name

import whylogs as why
from smart_config.recommenders.whylabs_recommender import setup_recommended_monitors

# A unique count monitor is useful for columns that are expected to have a low number of fixed values

# Detect by
# semantic type in a specified list
# unique count from ref profile

# Options for monitor
# unique count shouldnt exceed ref profile unique count - can we even do this?
# Stddev or fixed percent unique count vs ref profile or trailing window - in case where variation is expected
# Batch frequent items should be subset of Ref frequent items (frequent_items_comparison) if # < xxx
from smart_config.ref_profile import get_ref_profile_by_name

results = why.log(ref_df)
ref_profile = results.profile()
ref_profile_metadata = get_ref_profile_by_name(demo_org_id, demo_dataset_id, ref_dataset_name)
setup_recommended_monitors(org_id=demo_org_id, dataset_id=demo_dataset_id, ref_profile=ref_profile, ref_profile_id=ref_profile_metadata.id)

#
# type_hints = get_semantic_types(ref_profile)
# setup_recommended_monitors(org_id=demo_org_id, dataset_id=demo_dataset_id, ref_profile=ref_profile, ref_profile_id=ref_profile_metadata.id, type_hints=type_hints)

# segments = recommend_segments(type_hints)

# setup_recommended_monitors(org_id=demo_org_id, dataset_id=demo_dataset_id, ref_profile=ref_profile, ref_profile_id=ref_profile_metadata.id,
# type_hints = {
#     'age': 'age',
#     'gender' : 'gender',
#     'native-country': 'country',
# }
# )

# setup_recommended_monitors(org_id=demo_org_id, dataset_id=demo_dataset_id)

#
# setup_recommended_monitors(org_id=demo_org_id,
#                            dataset_id=demo_dataset_id,
#                            ref_profile=ref_profile,
#                            ref_profile_id=ref_profile_metadata.id,
#                            categories=[MetricCategory.data_quality])
# setup_recommended_monitors(org_id=demo_org_id,
#                            dataset_id=demo_dataset_id,
#                            ref_profile=ref_profile,
#                            ref_profile_id=ref_profile_metadata.id,
#                            analysis_metrics=[SimpleColumnMetric.unique_est])  # Need a way to bridge to monitor metric enum
# # setup_recommended_monitors(org_id=demo_org_id, dataset_id=demo_dataset_id, ref_profile=ref_profile, ref_profile_id=ref_profile_metadata.id, columns=top_n_by_weight())
# setup_recommended_monitors(org_id=demo_org_id, dataset_id=demo_dataset_id, ref_profile=ref_profile, ref_profile_id=ref_profile_metadata.id, policies=[FalsePositiveTolerance('low')])
# explain_recommended_monitors(...)

