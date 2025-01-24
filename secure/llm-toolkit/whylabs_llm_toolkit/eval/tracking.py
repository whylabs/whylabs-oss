import inspect
import logging
import os
import tempfile
from typing import Union

import mlflow
from dotenv import load_dotenv

from whylabs_llm_toolkit.models.base import BinaryClassifier, MultiInputScorer, Scorer

from .evaluation_metrics import BinaryClassificationResult, plot_roc

load_dotenv()

logger = logging.getLogger(__name__)


def track_results_mlflow(
    experiment_name: str,
    results: dict[str, BinaryClassificationResult],
    model: Union[BinaryClassifier, Scorer, MultiInputScorer],
):
    db_token = os.getenv("DATABRICKS_TOKEN")
    db_host = os.getenv("DATABRICKS_HOST")
    if not db_token or not db_host:
        raise ValueError("Databricks token and host must be set in the environment variables")
    mlflow.set_tracking_uri("databricks")
    experiment_name = experiment_name.replace(" ", "_")
    mlflow.set_experiment(f"/LKBenchmark_{experiment_name}")
    model_name = model.__class__.__name__
    model_code = inspect.getsource(model.__class__)
    with mlflow.start_run():
        mlflow.log_param("model", model_name)
        mlflow.log_text(model_code, "model_source_code.txt")
        for key, value in results.items():
            results_dict = value.to_dict()
            for metric, metric_value in results_dict.items():
                if isinstance(metric_value, float) or isinstance(metric_value, int):
                    mlflow.log_metric(f"{key}.{metric}", float(metric_value))
            if any(k.startswith("roc_curve") for k in results_dict):
                fpr = results_dict["roc_curve.fpr"]
                tpr = results_dict["roc_curve.tpr"]
                thresholds = results_dict["roc_curve.thresholds"]
                if fpr and tpr and thresholds:
                    if not isinstance(fpr, list) or not isinstance(tpr, list) or not isinstance(thresholds, list):
                        raise ValueError("ROC curve data must be lists")

                    plt = plot_roc(fpr, tpr, thresholds)
                    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as temp_file:
                        roc_plot_path = temp_file.name
                        plt.savefig(roc_plot_path)  # pyright: ignore[reportUnknownMemberType]
                    mlflow.log_artifact(roc_plot_path, f"ROC Curve {key}")
                else:
                    logger.warning("No ROC curve data to log")
