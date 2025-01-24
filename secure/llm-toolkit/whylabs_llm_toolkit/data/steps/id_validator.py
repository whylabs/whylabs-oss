# pyright: reportUnknownMemberType=false, reportUnknownVariableType=false, reportUnknownArgumentType=false
from typing import List, Optional

import pandas as pd

from langkit.core.validation import ValidationFailure, ValidationResult, Validator


class IdValidator(Validator):
    def get_target_metric_names(self) -> List[str]:
        return ["uid"]

    def validate_result(self, df: pd.DataFrame) -> Optional[ValidationResult]:
        # check for duplicates in the uid column
        if df["uid"].duplicated().any():
            first_offending_row = df[df["uid"].duplicated(keep="first")]
            uid_value = first_offending_row["uid"].iloc[0]
            id_value = first_offending_row["id"].iloc[0]

            return ValidationResult(
                report=[ValidationFailure(id=id_value, metric="uid", details="Duplicate values found in the uid column.", value=uid_value)]
            )

        return None
