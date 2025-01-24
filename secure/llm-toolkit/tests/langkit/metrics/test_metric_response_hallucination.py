# pyright: reportUnknownMemberType=none

import pandas as pd
import pytest

from langkit.core.workflow import Workflow
from langkit.metrics.response_hallucination import prompt_response_hallucination_metric


@pytest.mark.integration
def test_input_output():
    df = pd.DataFrame(
        {
            "prompt": [
                "who was Marie Curie?",
            ],
            "response": [
                "Marie Curie was an English barrister and politician who served as Member of Parliament for Thetford from 1859 to 1868.",
            ],
        }
    )

    wf = Workflow(metrics=[prompt_response_hallucination_metric])

    actual = wf.run(df)

    expected_columns = ["response.hallucination.hallucination_score", "id"]

    assert actual.metrics.columns.tolist() == expected_columns
    assert 0.5 < actual.metrics["response.hallucination.hallucination_score"].tolist()[0] < 0.9


@pytest.mark.integration
def test_input_output_row():
    resp = "Marie Curie was an English barrister and politician who served as Member of Parliament for Thetford from 1859 to 1868."
    row = {
        "prompt": "who was Marie Curie?",
        "response": resp,
    }

    wf = Workflow(metrics=[prompt_response_hallucination_metric])

    actual = wf.run(row)

    expected_columns = ["response.hallucination.hallucination_score", "id"]

    assert actual.metrics.columns.tolist() == expected_columns
    assert 0.5 < actual.metrics["response.hallucination.hallucination_score"].tolist()[0] < 0.9


@pytest.mark.integration
def test_input_output_multiple():
    df = pd.DataFrame(
        {
            "prompt": [
                "who was Marie Curie?",
                "Ask me a question",
            ],
            "response": [
                "Marie Curie was an English barrister and politician who served as Member of Parliament for Thetford from 1859 to 1868.",
                "the sky is eating",
            ],
        }
    )

    wf = Workflow(metrics=[prompt_response_hallucination_metric])

    actual = wf.run(df)

    expected_columns = ["response.hallucination.hallucination_score", "id"]

    assert actual.metrics.columns.tolist() == expected_columns
    assert 0.5 < actual.metrics["response.hallucination.hallucination_score"].tolist()[0] < 0.9
    assert 0 <= actual.metrics["response.hallucination.hallucination_score"].tolist()[1] <= 1
