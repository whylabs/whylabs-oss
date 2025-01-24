import os

dirname = os.path.dirname(__file__)
_data_path = os.path.join(dirname, "../../../data")
_raw_data_path = os.path.join(dirname, "../../../raw_data")
_results_path = os.path.join(dirname, "../../../results")


def data_path():
    return _data_path


def raw_data_path():
    return _raw_data_path


def results_path():
    return _results_path
