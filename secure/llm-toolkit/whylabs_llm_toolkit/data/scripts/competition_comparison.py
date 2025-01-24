import logging
from functools import partial
from typing import Any, Dict, List, Optional, Tuple, cast

import click
import pandas as pd

import langkit.metrics.response_hallucination as hallucination
from langkit.core.metric import MetricCreator, WorkflowOptions
from langkit.core.workflow import Workflow
from langkit.metrics.injections_chroma_twoclass import injections_twoclass_metric_chroma
from langkit.metrics.malicious import malicious_metric
from langkit.metrics.wf_option_util import WorkflowOptionUtil
from langkit.openai.hallucination_types import LLMInvoker
from langkit.transformer import EmbeddingChoiceArg, WhyLabsSupportedEncoder
from whylabs_llm_toolkit.data.datasets.full_datasets.market_performance_data import AnthropicWithNemoDataset, SafeguardNemoInjectionDataset
from whylabs_llm_toolkit.data.datasets.hallucination_dataset import HallucinationDataset, HallucinationNemoResultsDataset
from whylabs_llm_toolkit.data.labels import Labels
from whylabs_llm_toolkit.data.scripts.targets import ArtifactPaths, AssetStage, SentenceTransformerEncoder, get_encoder_targets
from whylabs_llm_toolkit.data.scripts.utils import generate_index_html
from whylabs_llm_toolkit.eval.evaluation_metrics import (
    MetricInput,
    calculate_binary_classification_results,
    find_predictions_for_best_threshold,
)
from whylabs_llm_toolkit.settings import reload_settings

_logger = logging.getLogger(__name__)

_HEAD_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Benchmark Results</title>
    <link rel="stylesheet" href="https://cdn.simplecss.org/simple.min.css">
</head>"""


class WikiBioChecker(hallucination.ConsistencyChecker):
    def __init__(self, llm: LLMInvoker, num_samples: int, choice: EmbeddingChoiceArg):
        super().__init__(llm, num_samples, choice)
        self._n = 0
        # TODO: maybe pick random samples to simulate LLM variance
        self._samples: pd.Series[Any] = HallucinationDataset().get_data("eval")["gpt3_text_samples"].apply(lambda x: x[0:num_samples])  # pyright: ignore[reportUnknownMemberType, reportUnknownLambdaType]

    def get_samples(self, prompt: str) -> List[hallucination.ChatLog]:
        samples: List[hallucination.ChatLog] = []
        for sample in self._samples[self._n]:
            response = hallucination.ChatLog(prompt, sample)
            samples.append(response)
        self._n += 1
        return samples


def get_whylabs_hallucination_preds(data: pd.DataFrame, st: SentenceTransformerEncoder) -> Tuple[List[float], float]:
    d: Dict[str, List[str]] = {"prompt": ["prompt"] * len(data), "response": [text for text in data["gpt3_text"]]}  # pyright: ignore[reportUnknownVariableType]
    df = pd.DataFrame(d)
    hallucination_metric = partial(hallucination.hallucination_metric, "prompt", "response", st, checker_class=WikiBioChecker)
    wf = Workflow(metrics=[hallucination_metric])
    results = wf.run(df)

    # NOTE: latency is bogus since we use canned extra responses instead of LLM calls
    total_latency = results.perf_info.metrics_total_sec + results.perf_info.context_total_sec
    scores_list: List[float] = results.metrics["response.hallucination.hallucination_score"].tolist()
    return scores_list, total_latency


def get_whylabs_injection_preds(
    texts: List[str], paths: ArtifactPaths, st: SentenceTransformerEncoder, stage: Optional[AssetStage] = None
) -> Tuple[List[float], float]:
    options: WorkflowOptions = {}
    WorkflowOptionUtil.set_embedding_choice(options, WhyLabsSupportedEncoder(st.name))
    if stage is not None:  # if stage is provided, don't use the model from paths
        inj_metric: MetricCreator = partial(injections_twoclass_metric_chroma, column_name="prompt", stage=stage)
    else:
        inj_metric: MetricCreator = partial(
            injections_twoclass_metric_chroma, column_name="prompt", local_path=paths.get_chromadb_path(st, Labels.injection, twoclass=True)
        )

    wf = Workflow(
        metrics=[
            inj_metric(),
        ],
        options=options,
    )
    results = wf.run(pd.DataFrame({"prompt": texts}))
    total_latency = results.perf_info.metrics_total_sec + results.perf_info.context_total_sec
    scores_list: List[float] = results.metrics["prompt.similarity.injection"].tolist()
    return scores_list, total_latency


def get_whylabs_preds(
    texts: List[str], paths: ArtifactPaths, st: SentenceTransformerEncoder, stage: Optional[AssetStage] = None
) -> Tuple[List[float], float]:
    options: WorkflowOptions = {}
    WorkflowOptionUtil.set_embedding_choice(options, WhyLabsSupportedEncoder(st.name))

    if stage is not None:  # if stage is provided, don't use the model from paths
        malicious_metrics = partial(malicious_metric, column_name="prompt", stage=stage)
    else:
        malicious_metrics = partial(malicious_metric, column_name="prompt", local_path=paths.get_classifier_model_path(st))

    wf = Workflow(
        metrics=[
            malicious_metrics(),
        ],
        options=options,
    )

    results = wf.run(pd.DataFrame({"prompt": texts}))
    total_latency = results.perf_info.metrics_total_sec + results.perf_info.context_total_sec
    preds_whylabs: List[float] = []
    for col in results.metrics.columns:
        if "prompt.topics.malicious" in col:
            preds_whylabs: List[float] = results.metrics[col].tolist()
            break
    if len(preds_whylabs) == 0:
        raise ValueError("No predictions found")
    return preds_whylabs, total_latency


def write_hallucination_benchmark_results(paths: ArtifactPaths, st: SentenceTransformerEncoder, stage: Optional[AssetStage] = None) -> str:
    data = HallucinationNemoResultsDataset().get_data("eval")
    labels: List[int] = data["truth"].tolist()
    preds_nemo: List[int] = [1 if x == "no" else 1 for x in data["hallucination_agreement"]]  # pyright: ignore[reportUnknownVariableType]
    total_nemo_latency = sum(data["latency"])  # pyright: ignore[reportUnknownArgumentType]
    support = len(data)
    wiki_data = HallucinationDataset().get_data("eval")
    scores_whylabs, total_whylabs_latency = get_whylabs_hallucination_preds(wiki_data, st)
    threshold, preds_whylabs = find_predictions_for_best_threshold(labels, scores_whylabs)

    nemo_metric_input = MetricInput(
        labels=labels,
        scores=None,
        predictions=preds_nemo,
        time=total_nemo_latency,
    )

    whylabs_metric_input = MetricInput(
        labels=labels,
        scores=scores_whylabs,
        predictions=preds_whylabs,
        time=total_whylabs_latency,
        threshold=threshold,
    )
    nemo_results = calculate_binary_classification_results(nemo_metric_input)
    whylabs_results = calculate_binary_classification_results(whylabs_metric_input)
    nemo_avg_latency, whylabs_avg_latency = None, None
    nemo_precision, nemo_recall = None, None
    whylabs_precision, whylabs_recall = None, None
    if nemo_results.results[0].time is not None:
        nemo_avg_latency = round(1000 * nemo_results.results[0].time / support, 1)
    if whylabs_results.results[0].time is not None:
        whylabs_avg_latency = round(1000 * whylabs_results.results[0].time / support, 1)
    if nemo_results.results[0].precision is not None:
        nemo_precision = round(nemo_results.results[0].precision, 3)
    if nemo_results.results[0].recall is not None:
        nemo_recall = round(nemo_results.results[0].recall, 3)
    if whylabs_results.results[0].precision is not None:
        whylabs_precision = round(whylabs_results.results[0].precision, 3)
    if whylabs_results.results[0].recall is not None:
        whylabs_recall = round(whylabs_results.results[0].recall, 3)
    num_positive = sum(labels)
    num_negative = len(labels) - num_positive
    benchmark_df = pd.DataFrame(columns=["Avg. Latency(ms)", "Precision", "Recall"])
    benchmark_df.loc["Nemo"] = [nemo_avg_latency, nemo_precision, nemo_recall]
    benchmark_df.loc["Whylabs"] = [whylabs_avg_latency, whylabs_precision, whylabs_recall]
    html_table = benchmark_df.to_html()  # pyright: ignore[reportUnknownMemberType]
    html_content = f"""<h1>Hallucination</h1>
        {html_table}
        <p> The data used for the benchmark was sourced from the
        <a href="https://huggingface.co/datasets/potsawee/wiki_bio_gpt3_hallucination">WikiBio GPT-3 Hallucination Dataset</a>,
        with {num_positive} positive and {num_negative} negative samples.  </p>
        <p> The results for NeMo were calculated using the Hallucination guardrail as per
         <a href="https://github.com/NVIDIA/NeMo-Guardrails/blob/develop/docs/evaluation/README.md#hallucination-rails">
         Nemo Documentation</a>, using the gpt-3.5-turbo model. </p>
        <p> The results from WhyLabs were calculated using response.hallucination.hallucination_score metric with a threshold of
        {str(round(threshold, 3))}, also with the gpt-3.5-turbo model. Note that the latencies include only the
        time for the consistency check, not generating the original or additional responses.</p>"""

    # Save to a file
    return html_content


def write_safeguard_injection_benchmark_results(
    paths: ArtifactPaths, st: SentenceTransformerEncoder, stage: Optional[AssetStage] = None
) -> str:
    data = SafeguardNemoInjectionDataset().get_data("test", strict_columns=False)
    labels = [1 if label == "injection" else 0 for label in data["dataset"].tolist()]  # pyright: ignore[reportUnknownVariableType]
    texts: List[str] = data["text"].tolist()
    preds_nemo: List[int] = data["prediction"].tolist()
    latencies_nemo: List[float] = data["latency"].tolist()
    support = len(texts)
    scores_whylabs, total_whylabs_latency = get_whylabs_injection_preds(texts, paths, st, stage=stage)
    threshold, preds_whylabs = find_predictions_for_best_threshold(labels, scores_whylabs)
    nemo_metric_input = MetricInput(
        labels=labels,
        scores=None,
        predictions=preds_nemo,
        time=sum(latencies_nemo),
    )

    whylabs_metric_input = MetricInput(
        labels=labels,
        scores=scores_whylabs,
        predictions=preds_whylabs,
        time=total_whylabs_latency,
        threshold=threshold,
    )
    nemo_results = calculate_binary_classification_results(nemo_metric_input)
    whylabs_results = calculate_binary_classification_results(whylabs_metric_input)
    nemo_avg_latency, whylabs_avg_latency = None, None
    nemo_precision, nemo_recall = None, None
    whylabs_precision, whylabs_recall = None, None
    if nemo_results.results[0].time is not None:
        nemo_avg_latency = round(1000 * nemo_results.results[0].time / support, 1)
    if whylabs_results.results[0].time is not None:
        whylabs_avg_latency = round(1000 * whylabs_results.results[0].time / support, 1)
    if nemo_results.results[0].precision is not None:
        nemo_precision = round(nemo_results.results[0].precision, 3)
    if nemo_results.results[0].recall is not None:
        nemo_recall = round(nemo_results.results[0].recall, 3)
    if whylabs_results.results[0].precision is not None:
        whylabs_precision = round(whylabs_results.results[0].precision, 3)
    if whylabs_results.results[0].recall is not None:
        whylabs_recall = round(whylabs_results.results[0].recall, 3)
    benchmark_df = pd.DataFrame(columns=["Avg. Latency(ms)", "Precision", "Recall"])
    benchmark_df.loc["Nemo"] = [nemo_avg_latency, nemo_precision, nemo_recall]
    benchmark_df.loc["Whylabs"] = [whylabs_avg_latency, whylabs_precision, whylabs_recall]
    html_table = benchmark_df.to_html()  # pyright: ignore[reportUnknownMemberType]
    html_content = f"""<h1>Injections</h1>
        {html_table}
        <p> The data used for the benchmark was sourced from the
        <a href="https://huggingface.co/datasets/xTRam1/safe-guard-prompt-injection">Safeguard Prompt Injections dataset</a>,
        with 50 positive and 50 negative samples.  </p>
        <p> The results for NeMo were calculated using the Self-Check guardrail as per
         <a href=https://docs.nvidia.com/nemo/guardrails/getting_started/4_input_rails/README.html#jailbreak-attempts>
         Nemo Documentation</a>, using the gpt-3.5-turbo-instruct model. </p>
        <p> The results from WhyLabs were calculated using prompt.similarity.injection metric with a threshold of {str(round(threshold, 3))}
        </p>"""

    # Save to a file
    return html_content


def write_anthropic_harmful_benchmark_results(
    paths: ArtifactPaths, st: SentenceTransformerEncoder, stage: Optional[AssetStage] = None
) -> str:
    """
    The source data for this benchmark is from the Anthropic Red Team Attempts and Helpful Base datasets.
    https://huggingface.co/datasets/Anthropic/hh-rlhf
    sha: d8d97fe9e96fcd19cc8fc31bd04ee393422abfbb

    """
    data = AnthropicWithNemoDataset().get_data("test", strict_columns=False)
    labels = [1 if label == "harmful" else 0 for label in data["dataset"].tolist()]  # pyright: ignore[reportUnknownVariableType]
    texts: List[str] = data["text"].tolist()
    preds_nemo: List[int] = data["prediction_nemo"].tolist()
    total_latencies_nemo: List[float] = data["latency_nemo"].tolist()

    preds_whylabs: List[float] = []
    preds_whylabs, total_whylabs_latency = get_whylabs_preds(texts, paths, st, stage=stage)
    support = len(texts)

    nemo_metric_input = MetricInput(
        labels=labels,
        scores=None,
        predictions=preds_nemo,
        time=sum(total_latencies_nemo),
    )
    whylabs_th, binary_whylabs_preds = find_predictions_for_best_threshold(labels, preds_whylabs)

    whylabs_metric_input = MetricInput(
        labels=labels,
        scores=None,
        threshold=whylabs_th,
        predictions=binary_whylabs_preds,
        time=total_whylabs_latency,
    )

    nemo_results = calculate_binary_classification_results(nemo_metric_input)

    whylabs_results = calculate_binary_classification_results(whylabs_metric_input)
    nemo_avg_latency, whylabs_avg_latency = None, None
    nemo_precision, nemo_recall = None, None
    whylabs_precision, whylabs_recall = None, None
    if nemo_results.results[0].time is not None:
        nemo_avg_latency = round(1000 * nemo_results.results[0].time / support, 1)
    if whylabs_results.results[0].time is not None:
        whylabs_avg_latency = round(1000 * whylabs_results.results[0].time / support, 1)
    if nemo_results.results[0].precision is not None:
        nemo_precision = round(nemo_results.results[0].precision, 3)
    if nemo_results.results[0].recall is not None:
        nemo_recall = round(nemo_results.results[0].recall, 3)
    if whylabs_results.results[0].precision is not None:
        whylabs_precision = round(whylabs_results.results[0].precision, 3)
    if whylabs_results.results[0].recall is not None:
        whylabs_recall = round(whylabs_results.results[0].recall, 3)
    benchmark_df = pd.DataFrame(columns=["Avg. Latency(ms)", "Precision", "Recall"])
    benchmark_df.loc["Nemo"] = [nemo_avg_latency, nemo_precision, nemo_recall]
    benchmark_df.loc["Whylabs"] = [whylabs_avg_latency, whylabs_precision, whylabs_recall]
    model_name: str = cast(str, data.iloc[0]["model"])
    html_table = benchmark_df.to_html()  # pyright: ignore[reportUnknownMemberType]
    html_content = f"""<h1>Harmfulness</h1>
        {html_table}
        <p> The results for NeMo were calculated using the Self-Check guardrail with the Simple Prompt, using the
        {model_name} model. </p>
        <p> The results for WhyLabs were calculated using the prompt.topics.malicious score,
        with threshold of {str(round(whylabs_th,3))} </p>
        <p> The data used for the benchmark was sourced from Anthropic's
        <a href="https://huggingface.co/datasets/Anthropic/hh-rlhf/tree/main/red-team-attempts">Red Team Attempts dataset</a> and
        <a href="https://huggingface.co/datasets/Anthropic/hh-rlhf/tree/main/helpful-base">Helpful Base dataset.</a>,
        with 50 positive and 50 negative samples  </p>"""
    return html_content


def write_market_performance_benchmark_results(
    name: str, st: SentenceTransformerEncoder = SentenceTransformerEncoder.AllMiniLML6V2, stage: Optional[AssetStage] = None
) -> None:
    paths = ArtifactPaths(name)
    harmful_html = write_anthropic_harmful_benchmark_results(paths, st, stage=stage)
    injection_html = write_safeguard_injection_benchmark_results(paths, st, stage=stage)
    hallucination_html = write_hallucination_benchmark_results(paths, st, stage=stage)
    comparison_path = paths.get_benchmark_results_path(st, "Comparison")
    with open(f"{comparison_path}/comparison_table.html", "w") as file:
        file.write(_HEAD_HTML + harmful_html + injection_html + hallucination_html)


@click.command()
@click.option("-n", "--name", type=str, required=True, help="The experiment name. Controls the model output directory.", envvar="NAME")
@click.option(
    "-e",
    "--encoders",
    type=str,
    required=False,
    multiple=True,
    help=f"""
Which sentence transformers to use, from: {str(list([it.name for it in SentenceTransformerEncoder.__members__.values()]))}
""",
    envvar="ENCODERS",
)
def cli(name: str, encoders: Optional[List[str]] = None):
    """
    Runs comparison tables to evaluate WhyLabs metrics with other competitors.
    """
    reload_settings()
    for st in get_encoder_targets(encoders):
        write_market_performance_benchmark_results(name, st)
    paths = ArtifactPaths(name)
    benchmark_folder = paths.get_benchmark_path()
    generate_index_html(benchmark_folder)
    reload_settings()


if __name__ == "__main__":
    cli()
