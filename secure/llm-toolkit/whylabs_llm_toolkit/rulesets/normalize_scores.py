import logging
from dataclasses import dataclass
from typing import Callable, Dict, Mapping, Optional, Tuple, Union

_logger = logging.getLogger(__name__)

NumericExpression = Callable[[Union[int, float], float], bool]
StrExpression = Callable[[Optional[str], float], bool]


@dataclass
class SensitivitySettings:
    low: float
    medium: float
    high: float
    max: float
    min: float
    check_str: Optional[StrExpression] = None
    check_number: Optional[NumericExpression] = None
    upper_threshold: Optional[bool] = False
    contributes_to_max_score: Optional[bool] = True
    none_score: Optional[int] = None

    def get_threshold(self, sensitivity_level: str) -> float:
        if sensitivity_level == "medium":
            return self.medium
        elif sensitivity_level == "high":
            return self.high
        else:
            return self.low


# These should be read in from something like a config file, inlining as defaults
thresholds: Mapping[str, SensitivitySettings] = {
    "prompt.similarity.injection": SensitivitySettings(
        high=0.564, medium=0.583, low=0.742, max=1.0, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "prompt.similarity.jailbreak": SensitivitySettings(
        high=0.32, medium=0.42, low=0.62, max=1.0, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "prompt.similarity.medical": SensitivitySettings(
        high=0.415, medium=0.432, low=0.45, max=1.0, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "prompt.similarity.code": SensitivitySettings(
        high=0.407, medium=0.416, low=0.463, max=1.0, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "prompt.similarity.financial": SensitivitySettings(
        high=0.501, medium=0.536, low=0.566, max=1.0, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "prompt.similarity.toxic": SensitivitySettings(
        high=0.314, medium=0.385, low=0.416, max=1.0, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "prompt.similarity.hate": SensitivitySettings(
        high=0.355, medium=0.383, low=0.446, max=1.0, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "prompt.similarity.innocuous": SensitivitySettings(
        high=0.407, medium=0.447, low=0.524, max=1.0, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "prompt.similarity.harmful": SensitivitySettings(
        high=0.474, medium=0.522, low=0.599, max=1.0, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "prompt.pii.redacted": SensitivitySettings(
        low=0,
        medium=0,
        high=0,
        max=2.0,
        min=0.0,
        check_str=lambda value, threshold: bool(value),
        check_number=lambda value, threshold: value > threshold,
        none_score=30,
    ),
    "prompt.pii.*": SensitivitySettings(
        low=0,
        medium=0,
        high=0,
        max=2.0,
        min=0.0,
        check_str=lambda value, threshold: bool(value),
        check_number=lambda value, threshold: value > threshold,
    ),
    "prompt.regexes.*": SensitivitySettings(low=0, medium=0, high=0, max=2.0, min=0.0, check_str=lambda value, threshold: bool(value)),
    "prompt.topics.*": SensitivitySettings(
        high=0.15, medium=0.25, low=0.5, max=1.0, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "response.topics.*": SensitivitySettings(
        low=0.15, medium=0.25, high=0.5, max=1.0, min=0.0, check_number=lambda value, threshold: value < threshold, upper_threshold=True
    ),
    "prompt.topics.medical": SensitivitySettings(
        high=0.41, medium=0.45, low=0.5, max=0.7, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "prompt.topics.code": SensitivitySettings(
        high=0.33, medium=0.36, low=0.4, max=0.5, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "prompt.topics.financial": SensitivitySettings(
        high=0.33, medium=0.36, low=0.4, max=0.5, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "prompt.topics.malicious": SensitivitySettings(
        high=0.24, medium=0.51, low=0.7, max=0.5, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "response.topics.medical": SensitivitySettings(
        high=0.41, medium=0.45, low=0.5, max=0.7, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "response.topics.code": SensitivitySettings(
        high=0.33, medium=0.36, low=0.4, max=0.5, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "response.topics.financial": SensitivitySettings(
        high=0.33, medium=0.36, low=0.4, max=0.5, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "response.topics.malicious": SensitivitySettings(
        high=0.24, medium=0.51, low=0.7, max=0.5, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "response.pii.*": SensitivitySettings(
        low=0,
        medium=0,
        high=0,
        max=2.0,
        min=0.0,
        check_str=lambda value, threshold: bool(value),
        check_number=lambda value, threshold: value > threshold,
    ),
    "response.regex.refusal": SensitivitySettings(
        low=0,
        medium=0,
        high=0,
        max=2.0,
        min=0.0,
        check_str=lambda value, threshold: bool(value),
        check_number=lambda value, threshold: value > threshold,
    ),
    "response.pii.redacted": SensitivitySettings(
        low=0,
        medium=0,
        high=0,
        max=2.0,
        min=0.0,
        check_str=lambda value, threshold: bool(value),
        check_number=lambda value, threshold: value > threshold,
        none_score=30,
    ),
    "response.similarity.refusal": SensitivitySettings(
        low=0.6, medium=0.3, high=0.2, max=1.0, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "response.similarity.medical": SensitivitySettings(
        high=0.415, medium=0.432, low=0.45, max=1.0, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "response.similarity.code": SensitivitySettings(
        high=0.407, medium=0.416, low=0.463, max=1.0, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "response.similarity.financial": SensitivitySettings(
        high=0.501, medium=0.536, low=0.566, max=1.0, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "response.similarity.toxic": SensitivitySettings(
        high=0.314, medium=0.385, low=0.416, max=1.0, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "response.similarity.hate": SensitivitySettings(
        high=0.355, medium=0.383, low=0.446, max=1.0, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "response.similarity.innocuous": SensitivitySettings(
        high=0.407, medium=0.447, low=0.524, max=1.0, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "response.similarity.harmful": SensitivitySettings(
        high=0.474, medium=0.522, low=0.599, max=1.0, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "response.sentiment.sentiment_score": SensitivitySettings(
        low=-0.8,
        medium=-0.5,
        high=0,
        max=1.0,
        min=-1.0,
        check_number=lambda value, threshold: value < threshold,
        upper_threshold=True,
    ),
    "response.hallucination.hallucination_score": SensitivitySettings(
        high=0.4, medium=0.5, low=0.7, max=1.0, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "prompt.sentiment.sentiment_score": SensitivitySettings(
        low=-0.8,
        medium=-0.5,
        high=0,
        max=1.0,
        min=-1.0,
        check_number=lambda value, threshold: value < threshold,
        upper_threshold=True,
        contributes_to_max_score=False,
    ),
    "prompt.toxicity.toxicity_score": SensitivitySettings(
        low=0.7,
        medium=0.5,
        high=0.4,
        max=1.0,
        min=0.0,
        check_number=lambda value, threshold: value > threshold,
        contributes_to_max_score=False,
    ),
    "prompt.topic.injection": SensitivitySettings(
        low=0.87,
        medium=0.78,
        high=0.43,
        max=1.0,
        min=0.0,
        check_number=lambda value, threshold: value > threshold,
        contributes_to_max_score=False,
    ),
    "prompt.topic.toxic": SensitivitySettings(
        low=0.88,
        medium=0.63,
        high=0.19,
        max=1.0,
        min=0.0,
        check_number=lambda value, threshold: value > threshold,
        contributes_to_max_score=False,
    ),
    "prompt.topic.hate": SensitivitySettings(
        low=0.74,
        medium=0.4,
        high=0.14,
        max=1.0,
        min=0.0,
        check_number=lambda value, threshold: value > threshold,
        contributes_to_max_score=False,
    ),
    "prompt.topic.harmful": SensitivitySettings(
        low=0.83,
        medium=0.44,
        high=0.40,
        max=1.0,
        min=0.0,
        check_number=lambda value, threshold: value > threshold,
        contributes_to_max_score=False,
    ),
    "prompt.topic.innocuous": SensitivitySettings(
        low=0.93,
        medium=0.81,
        high=0.55,
        max=1.0,
        min=0.0,
        check_number=lambda value, threshold: value > threshold,
        contributes_to_max_score=False,
    ),
    "response.toxicity.toxicity_score": SensitivitySettings(
        low=0.7, medium=0.5, high=0.4, max=1.0, min=0.0, check_number=lambda value, threshold: value > threshold
    ),
    "response.similarity.prompt": SensitivitySettings(
        low=0.08,
        medium=0.15,
        high=0.25,
        max=1.0,
        min=0.0,
        check_number=lambda value, threshold: value < threshold,
        upper_threshold=True,
    ),
    "response.similarity.context": SensitivitySettings(
        low=0.08,
        medium=0.15,
        high=0.25,
        max=1.0,
        min=0.0,
        check_number=lambda value, threshold: value < threshold,
        upper_threshold=True,
    ),
}


def find_thresholds_for_metric(metric_name: str) -> Optional[SensitivitySettings]:
    # there are two scenarios:
    #  1) the metric name is in the thresholds literally matching
    #  2) there is a wildcard for the suffix (third part)

    # return the exact match first if thats the case
    if metric_name in thresholds:
        return thresholds[metric_name]

    # check for wildcards around regexes, pii, topics
    parts = metric_name.split(".")
    if len(parts) == 3:
        wildcard_name = parts[0] + "." + parts[1] + ".*"
        if wildcard_name in thresholds:
            return thresholds.get(wildcard_name, None)
        else:
            _logger.debug(f"Could not find threshold for metric {metric_name} with wildcard {wildcard_name}")

    return None


def threshold_relative_score_normalization(
    metric_value: Union[float, int], max_val: float, min_val: float, threshold: float, lower_threshold: bool = True
) -> int:
    if min_val > metric_value:
        metric_value = min_val
    if not min_val <= metric_value <= max_val:
        metric_value = max_val
    if not min_val <= threshold <= max_val:
        raise ValueError("Threshold is outside the range of min and max.")

    if threshold == min_val:
        normalized_score = 70 if metric_value > threshold else 1
    elif max_val == threshold:
        normalized_score = 70
    # convention is to treat a score of 50 as the boundary for a detection at "medium" sensitivity
    elif metric_value <= threshold:
        # Scale between 1 and 50 using linear interpolation between min_value and threshold (might consider something fancier)
        normalized_score = 1 + (49 * (metric_value - min_val) / (threshold - min_val))
    else:
        # Scale between 50 and 100 when above threshold
        normalized_score = 50 + (50 * (metric_value - threshold) / (max_val - threshold))

    if not lower_threshold:
        normalized_score = 101 - normalized_score

    return round(normalized_score)


def calculate_rule_set_score(row: Mapping[str, Union[float, int, Optional[str]]]) -> Tuple[Optional[int], Dict[str, Optional[int]]]:
    """
    Calculate normalized scores for a set of metrics based on the thresholds defined in the thresholds dictionary.

    :return: The score for the rule set, and the scores for each individual metrics that went into that calculation, in
    the same order as the input mapping (important).
    """
    max_normalized_score: Optional[int] = None  # default to 1 being the lowest to match the 1-100 semantics
    scores: Dict[str, Optional[int]] = {}

    # Process only the metrics the specified Ruleset for this named rule set score
    for metric_name in row:
        thresholds_for_metric = find_thresholds_for_metric(metric_name)
        metric_value = row[metric_name]
        if thresholds_for_metric is not None:
            threshold_value = thresholds_for_metric.medium
            # Check if the metric breaches the threshold
            is_numeric_value = isinstance(metric_value, (int, float))
            is_str_value = isinstance(metric_value, str)
            is_none = metric_value is None
            normalized_score = 0
            if is_numeric_value:
                max_value = thresholds_for_metric.max
                min_value = thresholds_for_metric.min
                medium_threshold = thresholds_for_metric.medium
                lower_threshold = not thresholds_for_metric.upper_threshold  # default is thresholds are lower bounds
                normalized_score = threshold_relative_score_normalization(
                    metric_value=metric_value,
                    max_val=max_value,
                    min_val=min_value,
                    threshold=medium_threshold,
                    lower_threshold=lower_threshold,
                )
                scores[metric_name] = normalized_score

            elif is_str_value:
                if thresholds_for_metric.check_str is None:
                    raise ValueError(
                        f"Missing str expression in metric {metric_name} {thresholds_for_metric} for str metric value: {metric_value}"
                    )
                breaches_threshold = thresholds_for_metric.check_str(metric_value, threshold_value)
                normalized_score = 70 if breaches_threshold else 30
                scores[metric_name] = normalized_score

            elif is_none:
                if thresholds_for_metric.none_score is not None:
                    normalized_score = thresholds_for_metric.none_score
                else:
                    normalized_score = None

            scores[metric_name] = normalized_score

            if not thresholds_for_metric.contributes_to_max_score or normalized_score is None:
                # We want to compute scores for everything so they can be monitored but some shouldn't contribute to the max,
                # which is the overall category score
                pass
            elif max_normalized_score is None:
                max_normalized_score = normalized_score
            else:
                max_normalized_score = max(max_normalized_score, normalized_score)
        else:
            scores[metric_name] = None
            _logger.debug(f"Skipping metric {metric_name} as it is not in the threshold list")

    return max_normalized_score, scores
