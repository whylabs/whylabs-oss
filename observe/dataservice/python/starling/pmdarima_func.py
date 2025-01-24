from __future__ import unicode_literals

from typing import List, Optional

import numpy as np
import pandas as pd
from dataclasses import dataclass, asdict
import pmdarima as pm
import json
import os
from starling.monitorclasses import CalculationResult, Prediction
from scipy.stats import norm as spnorm

_ADJUSTED_PREDICTION = 'adjustedPrediction'

_SHOULD_REPLACE = 'shouldReplace'

_LAMBDA_KEEP = 'lambdaKeep'

_VALUE_COL = 'value'
_TIMESTAMP_COL = 'timestamp'
_REPLACEMENT = 'replacementValue'

_DEBUG_MODE = os.getenv("STARLING_DEBUG")


@dataclass
class Event(object):
    start: pd.Timestamp
    end: pd.Timestamp


class PmdArimaFunction(object):
    @classmethod
    def compute(cls,
                values: List[Optional[float]],
                timestamps: List[int],
                actual: float,
                priors: List[dict],
                alpha: float,
                stddevFactor: float,
                stddevMaxBatchSize: int,
                p: int,
                d: int,
                q: int,
                seasonal_P: int,  # noqa
                seasonal_D: int,  # noqa
                seasonal_Q: int,  # noqa
                m: int,
                eventPeriods: List[str] = None,
                oob_multiple: float = 1.0,
                adjustment_tries: int = 10,
                lambda_keep: float = 0.5,
                ) -> Prediction:
        """

        Args:
            values: the list of baseline values
            timestamps: the associated timestamps for these values.The size must match the size of the value list
            actual: the target value for predicting anomaly
            priors: the list of prior calcuation results
        """

        pdf = pd.DataFrame(zip(timestamps, values), columns=[('%s' % _TIMESTAMP_COL), _VALUE_COL])
        if pdf.shape[0] < 30:
            return Prediction(
                value=None,
                lower=None,
                upper=None,
                alertCount=0,
                shouldReplace=False,
                replacement=None,
                adjustedPrediction=None,
                lambdaKeep=lambda_keep,
            )


        prior_data = [(k, CalculationResult.from_dict(v)) for pair in priors for k, v in
                      pair.items()]
        prior_df = pd.json_normalize([{**{_TIMESTAMP_COL: int(k)}, **asdict(v)} for (k, v) in prior_data])
        if len(prior_df) > 0:
            # drop column with the duplicate name (but different semantic)
            prior_df = prior_df.drop(columns=[_VALUE_COL])
        if len(prior_df) > 0:
            pdf = pd.merge(pdf, prior_df, how='left', on=_TIMESTAMP_COL)
            pdf[_VALUE_COL] = np.where(pdf[_SHOULD_REPLACE]==True,
                    pdf[_VALUE_COL] * pdf[_LAMBDA_KEEP] + pdf[_LAMBDA_KEEP].sub(1).abs() * pdf[_ADJUSTED_PREDICTION],
                    pdf[_VALUE_COL])
        pdf[_TIMESTAMP_COL] = pd.to_datetime(pdf[_TIMESTAMP_COL], unit='ms', utc=True)
        pdf.set_index(_TIMESTAMP_COL, inplace=True)
        pdf[_VALUE_COL] = pdf[_VALUE_COL].fillna(method="ffill")

        target_date = pdf.index[-1] + pd.Timedelta(1, unit='D')
        if PmdArimaFunction.is_debug_on(target_date):
            print(f"Target date: {target_date}. Values: {values}")
            print(f"Target date: {target_date}. Timestamps: {timestamps}")
            print(f"Target date: {target_date}. Priors: {priors}")
            print(f"Target date: {target_date}. Prior data: {prior_df.to_json()}")
            print(f"Target date: {target_date}. Data for Training: {pdf.to_json()}")

        # list of events
        events: List[Event] = []

        baseline = pdf

        event_mask = np.repeat([False], len(baseline))
        is_ongoing_event = False
        if eventPeriods:
            for period in eventPeriods:
                start_str, end_str = period.split(":")
                start_ts = pd.Timestamp(start_str, tz='utc')
                end_ts = pd.Timestamp(end_str, tz='utc')
                events.append(Event(start_ts, end_ts))

            for e in events:
                current_event_mask = (baseline.index >= e.start) & (baseline.index < e.end)
                event_mask = event_mask | current_event_mask
                is_ongoing_event = is_ongoing_event | (e.start <= target_date < e.end)

        # if the event has ended, we should remove the event from the baseline
        if not is_ongoing_event:
            baseline = baseline[~event_mask]

        np_baseline = baseline[_VALUE_COL].to_numpy()
        if PmdArimaFunction.is_debug_on(target_date):
            print(f"Target date: {target_date}. Baseline: {baseline.to_json()}")

        # Insufficient baseline
        if len(np_baseline) < 30:
            print(f"Target date: {target_date}. Insufficient baseline. Fall back to stddev")
            return cls.create_stddev_prediction(actual, np_baseline, pdf, stddevFactor, lambda_keep)

        # Do ARIMA
        model = pm.arima.ARIMA(
                order=(p, d, q),
                seasonal_order=(seasonal_P, seasonal_D, seasonal_Q, m),
                enforce_stationarity=False,
                suppress_warnings=True
        )

        try:
            model.fit(np_baseline)
            forecasts, conf_ints = model.predict(1, return_conf_int=True, alpha=alpha)
        except:
            if PmdArimaFunction.is_debug_on(target_date):
                print(f"Target date: {target_date}. Failed to run ARIMA. Fall back to stddev")
            return cls.create_stddev_prediction(actual, np_baseline, pdf, stddevFactor, lambda_keep)

        lower = conf_ints[0][0]
        upper = conf_ints[0][1]
        forecast = forecasts[0]

        # # Smoothing out with stddev for upper and lower bound since ARIMA can be wild
        stddev = pdf.std()[_VALUE_COL]
        lower_std = forecast - stddev * stddevFactor
        upper_std = forecast + stddev * stddevFactor
        if lower < lower_std:
            lower = lower_std
        if upper > upper_std:
            upper = upper_std

        # Cap bounds. This probably should be a boolean param to enable, but we turn on by default now
        absolute_min = np.min(pdf[_VALUE_COL]) - stddev * stddevFactor
        absolute_max = np.max(pdf[_VALUE_COL]) + stddev * stddevFactor
        adjusted_bound = False
        if upper > absolute_max:
            upper = absolute_max
            adjusted_bound = True
        if lower < absolute_min:
            lower = absolute_min
            adjusted_bound = True
        if adjusted_bound:
            new_forecast = (upper + lower) / 2
            forecast = new_forecast

        # Run replacement logic
        replacement = None
        # limit replacement to trigger only if we have enough baseline
        if is_ongoing_event:
            # Keep very little during event time
            lambda_keep = 0.2

        should_replace_upper = forecast + (upper - forecast) * oob_multiple
        should_replace_lower = forecast - (forecast - lower) * oob_multiple

        adjusted_prediction = None
        should_replace = False
        if actual < should_replace_lower or actual > should_replace_upper:
            should_replace = True
            stddev = (upper - lower) * spnorm.ppf(1 - (alpha / 2))
            adjusted_prediction = forecast + stddev * np.random.randn(adjustment_tries).mean()
            replacement = actual * lambda_keep + (1 - lambda_keep) * adjusted_prediction

        prediction = Prediction(value=forecast, lower=lower, upper=upper, replacement=replacement,
                alertCount=int(((actual < lower) or (actual > upper)) * 1), shouldReplace=should_replace,
                adjustedPrediction=adjusted_prediction, lambdaKeep=lambda_keep, )
        if PmdArimaFunction.is_debug_on(target_date):
            print(f"Target date: {target_date}. Prediction: {prediction}")

        return prediction

    @classmethod
    def is_debug_on(cls, target_date: pd.Timestamp):
        """
        Turns on debug mode for certain logic
        Args:
            target_date: turn on debug mode for these dates

        Returns:

        """
        if _DEBUG_MODE:
            start = pd.Timestamp(year=2022, month=8, day=28, tz='utc')
            end = pd.Timestamp(year=2022, month=9, day=20, tz='utc')
            return start <= target_date <= end
        return False

    @classmethod
    def create_stddev_prediction(cls,
                                 actual: float,
                                 np_baseline: np.array,
                                 pdf: pd.DataFrame,
                                 stddevFactor: float,
                                 lambda_keep: float,
                                 ):
        # oops we filtered out everything. Fall back to the full series
        if len(np_baseline) < 3:
            np_baseline = pdf[_VALUE_COL].to_numpy()
        np_baseline = np_baseline[~np.isnan(np_baseline)]
        median = np.median(np_baseline[-30:])
        _lower = median - stddevFactor * np.std(np_baseline)
        _upper = median + stddevFactor * np.std(np_baseline)
        return Prediction(
                value=median,
                lower=_lower,
                upper=_upper,
                # TODO: do we want to run replacement logic?
                replacement=actual,
                alertCount=int(((actual < _lower) or (actual > _upper)) * 1),
                shouldReplace=False,
                adjustedPrediction=None,
                lambdaKeep=lambda_keep,
        )
