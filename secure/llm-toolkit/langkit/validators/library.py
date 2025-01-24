from typing import List, Literal, Optional, Sequence, Union

from typing_extensions import NotRequired, TypedDict, Unpack

from langkit.core.validation import ValidationFailureLevel, Validator
from langkit.validators.comparison import (
    ConstraintValidator,
    ConstraintValidatorOptions,
    MultiColumnConstraintValidator,
    MultiColumnConstraintValidatorOptions,
)


class ConstraintOptions(TypedDict):
    target_metric: str
    upper_threshold: NotRequired[Optional[float]]
    upper_threshold_inclusive: NotRequired[Optional[float]]
    lower_threshold: NotRequired[Optional[float]]
    lower_threshold_inclusive: NotRequired[Optional[float]]
    one_of: NotRequired[Optional[Sequence[Union[str, float, int]]]]
    none_of: NotRequired[Optional[Sequence[Union[str, float, int]]]]
    must_be_non_none: NotRequired[Optional[bool]]
    must_be_none: NotRequired[Optional[bool]]
    failure_level: NotRequired[Optional[ValidationFailureLevel]]


class MultiColumnConstraintOptions(TypedDict):
    constraints: List[ConstraintValidatorOptions]
    operator: NotRequired[Literal["AND", "OR"]]
    report_mode: NotRequired[Literal["ALL_FAILED_METRICS", "FIRST_FAILED_METRIC"]]


class lib:
    @staticmethod
    def constraint(**kwargs: Unpack[ConstraintOptions]) -> Validator:
        one_of = kwargs.get("one_of")
        one_of = tuple(one_of) if one_of else None
        none_of = kwargs.get("none_of")
        none_of = tuple(none_of) if none_of else None

        return ConstraintValidator(
            ConstraintValidatorOptions(
                target_metric=kwargs["target_metric"],
                upper_threshold=kwargs.get("upper_threshold"),
                upper_threshold_inclusive=kwargs.get("upper_threshold_inclusive"),
                lower_threshold=kwargs.get("lower_threshold"),
                lower_threshold_inclusive=kwargs.get("lower_threshold_inclusive"),
                one_of=one_of,
                none_of=none_of,
                must_be_non_none=kwargs.get("must_be_non_none"),
                must_be_none=kwargs.get("must_be_none"),
                failure_level=kwargs.get("failure_level"),
            )
        )

    @staticmethod
    def multi_column_constraint(
        **kwargs: Unpack[MultiColumnConstraintOptions],
    ) -> Validator:
        return MultiColumnConstraintValidator(
            MultiColumnConstraintValidatorOptions(
                constraints=tuple(kwargs["constraints"]),
                operator=kwargs.get("operator") or "AND",
                report_mode=kwargs.get("report_mode") or "FIRST_FAILED_METRIC",
            )
        )
