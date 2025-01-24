from smart_config.server.diagnosis.detectors.narrow_threshold_band import NarrowThresholdBand
from smart_config.server.diagnosis.detectors.test_data import gen_analyzer, gen_diagnostic_data, gen_float_col_dict

results = [
    {
        'anomalyCount': 0,
        'datasetTimestamp': 100,
        'column': 'test1',
        'threshold': {'threshold_calculatedUpper': 100.05, 'threshold_calculatedLower': 100.0},
    },
    {
        'anomalyCount': 0,
        'datasetTimestamp': 200,
        'column': 'test1',
        'threshold': {'threshold_calculatedUpper': 100.05, 'threshold_calculatedLower': 100.0},
    },
    {
        'anomalyCount': 0,
        'datasetTimestamp': 300,
        'column': 'test1',
        'threshold': {'threshold_calculatedUpper': 101.1, 'threshold_calculatedLower': 100.0},
    }
    ,
    {
        'anomalyCount': 0,
        'datasetTimestamp': 400,
        'column': 'test1',
        'threshold': {'threshold_calculatedUpper': 101.1, 'threshold_calculatedLower': 100.0},
    }
]


def test_check_narrow_band():
    detector = NarrowThresholdBand()
    analyzer = gen_analyzer(config={'type': 'stddev', 'metric': 'count_null_ratio', 'factor': 3})
    data = gen_diagnostic_data(analyzer=analyzer)
    # this shouldn't trigger check
    data.set_analysis_results(results[0:2])
    cond = detector.check(analyzer, data)
    assert cond is not None


def test_check_not_narrow_band():
    detector = NarrowThresholdBand()
    analyzer = gen_analyzer(config={'type': 'stddev', 'metric': 'count_null_ratio', 'factor': 3})
    data = gen_diagnostic_data(analyzer=analyzer)
    # this shouldn't trigger check
    data.set_analysis_results(results)
    cond = detector.check(analyzer, data)
    assert cond is None


def test_neg_lower_threshold():
    detector = NarrowThresholdBand()
    analyzer = gen_analyzer(config={'type': 'stddev', 'metric': 'count_null_ratio', 'factor': 3})
    data = gen_diagnostic_data(analyzer=analyzer)
    # this shouldn't trigger check
    data.set_analysis_results([{
        'anomalyCount': 0,
        'datasetTimestamp': 100,
        'column': 'test1',
        'threshold': {'threshold_calculatedUpper': 100.01, 'threshold_calculatedLower': -100.0},
    }])
    cond = detector.check(analyzer, data)
    assert cond is None
