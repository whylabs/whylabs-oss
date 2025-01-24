from smart_config.server.diagnosis.detectors.changing_continuous import ChangingContinuous
from smart_config.server.diagnosis.detectors.test_data import gen_analyzer, gen_diagnostic_data, gen_float_col_dict


def test_check_not_changing():
    # condition doesn't exist if batches have similar medians
    detector = ChangingContinuous()
    analyzer = gen_analyzer(config={'type': 'drift', 'metric': 'histogram', 'threshold': 0.6})
    data = gen_diagnostic_data(analyzer=analyzer)
    # this shouldn't trigger check
    data.set_diagnostic_batches([
        gen_float_col_dict({'quantile_25': 1.5, 'median': 2.0, 'quantile_75': 2.5}),
        gen_float_col_dict({'quantile_25': 2.0, 'median': 2.0, 'quantile_75': 3.2})
    ])
    cond = detector.check(analyzer, data)
    assert cond is None


def test_check_changing():
    # condition exists if first batch median is outside last batch p25-p75
    detector = ChangingContinuous()
    analyzer = gen_analyzer(config={'type': 'drift', 'metric': 'histogram', 'threshold': 0.6})
    data = gen_diagnostic_data(analyzer=analyzer)
    # this should trigger check (first batch median below last batch p25)
    data.set_diagnostic_batches([
        gen_float_col_dict({'quantile_25': 1.1, 'median': 1.4, 'quantile_75': 2.5}),
        gen_float_col_dict({'quantile_25': 1.5, 'median': 2.0, 'quantile_75': 2.5})
    ])
    assert detector._check_p25_p75(analyzer, data) is not None
    # this should trigger check (first batch median above last batch p75)
    data.set_diagnostic_batches([
        gen_float_col_dict({'quantile_25': 1.5, 'median': 2.6, 'quantile_75': 2.8}),
        gen_float_col_dict({'quantile_25': 1.5, 'median': 2.2, 'quantile_75': 2.5})
    ])
    assert detector._check_p25_p75(analyzer, data) is not None


def test_check_narrow_band():
    # dont fire if the band is very narrow
    detector = ChangingContinuous()
    analyzer = gen_analyzer(config={'type': 'drift', 'metric': 'histogram', 'threshold': 0.6})
    data = gen_diagnostic_data(analyzer=analyzer)
    # narrow p25-p50 band with first median below last range
    data.set_diagnostic_batches([
        gen_float_col_dict({'quantile_25': 0.1, 'median': 0.10005, 'quantile_75': 0.2}),
        gen_float_col_dict({'quantile_25': 0.11, 'median': 0.099995, 'quantile_75': 0.2}),
        gen_float_col_dict({'quantile_25': 0.1, 'median': 0.10008, 'quantile_75': 0.2}),
    ])
    assert detector._check_p25_p75(analyzer, data) is None
    # narrow p50-p75 band with first median above last range
    data.set_diagnostic_batches([
        gen_float_col_dict({'quantile_25': 0.1, 'median': 0.20005, 'quantile_75': 0.20010}),
        gen_float_col_dict({'quantile_25': 0.1, 'median': 0.20006, 'quantile_75': 0.20010}),
        gen_float_col_dict({'quantile_25': 0.1, 'median': 0.19999, 'quantile_75': 0.2})
    ])
    assert detector._check_p25_p75(analyzer, data) is None


def test_check_all_same():
    # check this doesnt cause errors or fire
    detector = ChangingContinuous()
    analyzer = gen_analyzer(config={'type': 'drift', 'metric': 'histogram', 'threshold': 0.6})
    data = gen_diagnostic_data(analyzer=analyzer)
    # all same value
    row = [gen_float_col_dict({'quantile_25': 0.1, 'median': 0.1, 'mean': 0.1, 'quantile_75': 0.2})]
    data.set_diagnostic_batches(row * 10)
    assert detector.check(analyzer, data) is None


def test_increasing_median():
    # condition exists if 90% of values that change are increases
    detector = ChangingContinuous()
    analyzer = gen_analyzer(config={'type': 'drift', 'metric': 'histogram', 'threshold': 0.6})
    data = gen_diagnostic_data(analyzer=analyzer)
    # all increasing
    data.set_diagnostic_batches([
        gen_float_col_dict({'quantile_25': 0.0, 'median': 1.4, 'quantile_75': 2.5}),
        gen_float_col_dict({'quantile_25': 0.0, 'median': 1.5, 'quantile_75': 2.5}),
        gen_float_col_dict({'quantile_25': 0.0, 'median': 1.6, 'quantile_75': 2.5}),
        gen_float_col_dict({'quantile_25': 0.0, 'median': 1.7, 'quantile_75': 2.5}),
    ])
    assert detector.check(analyzer, data) is not None


def test_decreasing_median():
    # condition exists if 90% of values that change are decreases
    detector = ChangingContinuous()
    analyzer = gen_analyzer(config={'type': 'drift', 'metric': 'histogram', 'threshold': 0.6})
    data = gen_diagnostic_data(analyzer=analyzer)
    # all decreasing
    data.set_diagnostic_batches([
        gen_float_col_dict({'quantile_25': 0.0, 'mean': 1.7, 'quantile_75': 2.5}),
        gen_float_col_dict({'quantile_25': 0.0, 'mean': 1.6, 'quantile_75': 2.5}),
        gen_float_col_dict({'quantile_25': 0.0, 'mean': 1.5, 'quantile_75': 2.5}),
        gen_float_col_dict({'quantile_25': 0.0, 'mean': 1.4, 'quantile_75': 2.5}),
    ])
    assert detector.check(analyzer, data) is not None
    # decreasing or flat
    data.set_diagnostic_batches([
        gen_float_col_dict({'quantile_25': 0.0, 'mean': 1.7, 'quantile_75': 2.5}),
        gen_float_col_dict({'quantile_25': 0.0, 'mean': 1.6, 'quantile_75': 2.5}),
        gen_float_col_dict({'quantile_25': 0.0, 'mean': 1.5, 'quantile_75': 2.5}),
        gen_float_col_dict({'quantile_25': 0.0, 'mean': 1.5, 'quantile_75': 2.5}),
        gen_float_col_dict({'quantile_25': 0.0, 'mean': 1.4, 'quantile_75': 2.5}),
    ])
    assert detector.check(analyzer, data) is not None
    # less than 90% decreasing
    data.set_diagnostic_batches([
        gen_float_col_dict({'quantile_25': 0.0, 'mean': 1.7, 'quantile_75': 2.5}),
        gen_float_col_dict({'quantile_25': 0.0, 'mean': 1.6, 'quantile_75': 2.5}),
        gen_float_col_dict({'quantile_25': 0.0, 'mean': 1.5, 'quantile_75': 2.5}),
        gen_float_col_dict({'quantile_25': 0.0, 'mean': 1.6, 'quantile_75': 2.5}),
        gen_float_col_dict({'quantile_25': 0.0, 'mean': 1.4, 'quantile_75': 2.5}),
    ])
    assert detector.check(analyzer, data) is None


def test_matches_analyzer():
    detector = ChangingContinuous()
    assert not detector.matches_analyzer(
        gen_analyzer(config={'type': 'drift', 'metric': 'frequent_items', 'threshold': 0.6}))
    assert detector.matches_analyzer(gen_analyzer(
        config={'type': 'drift', 'metric': 'histogram', 'threshold': 0.6}))
