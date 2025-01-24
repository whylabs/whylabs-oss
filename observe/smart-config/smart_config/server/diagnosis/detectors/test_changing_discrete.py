from smart_config.server.diagnosis.detectors.changing_discrete import ChangingDiscrete
from smart_config.server.diagnosis.detectors.test_data import gen_analyzer, gen_diagnostic_data, gen_text_col_dict


def test_check_not_changing():
    # condition doesn't exist if batches match rollup
    detector = ChangingDiscrete()
    analyzer = gen_analyzer(config={'type': 'drift', 'metric': 'frequent_items', 'threshold': 0.6})
    data = gen_diagnostic_data(analyzer=analyzer)
    data.set_diagnostic_batches([gen_text_col_dict()])
    data.set_diagnostic_profile([gen_text_col_dict()])
    cond = detector.check(analyzer, data)
    assert cond is None


def test_check_changing():
    # condition does exist if unique count of rollup is more than 2* max of batches
    detector = ChangingDiscrete()
    analyzer = gen_analyzer(config={'type': 'drift', 'metric': 'frequent_items', 'threshold': 0.6})
    data = gen_diagnostic_data(analyzer=analyzer)
    data.set_diagnostic_batches([gen_text_col_dict({'unique_est': 2.0}), gen_text_col_dict({'unique_est': 3.0})])
    # this shouldn't trigger check
    data.set_diagnostic_profile([gen_text_col_dict({'unique_est': 5.0})])
    assert detector.check(analyzer, data) is None
    data.set_diagnostic_profile([gen_text_col_dict({'unique_est': 6.1})])
    # this should trigger check
    assert detector.check(analyzer, data) is not None


def test_matches_analyzer():
    detector = ChangingDiscrete()
    assert detector.matches_analyzer(
        gen_analyzer(config={'type': 'drift', 'metric': 'frequent_items', 'threshold': 0.6}))
    assert detector.matches_analyzer(gen_analyzer(
        config={'type': 'frequent_string_comparison', 'metric': 'frequent_items', 'operator': 'eq'}))
    assert not detector.matches_analyzer(gen_analyzer(
        config={'type': 'fixed', 'metric': 'mean', 'upper': 1.0}))
