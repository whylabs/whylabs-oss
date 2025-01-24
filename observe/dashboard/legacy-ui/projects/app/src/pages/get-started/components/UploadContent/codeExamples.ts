const installWhyLabsInstruction = `### First, install the latest whylogs version
### pip install -q 'whylogs'`;

const installPandasInstruction = `
### Second, install pandas
### pip install pandas`;

export const PythonExamples = {
  none: (modelId?: string, orgId?: string, token?: string, modelName?: string): string => {
    const modelIdPlaceholder = modelId ?? 'MODEL-ID';
    const orgIdPlaceholder = orgId ?? 'YOUR-ORG-ID';
    const tokenPlaceholder = token ?? 'YOUR-API-KEY';
    const modelNamePlaceholder = modelName ?? 'MODEL-NAME';

    return `${installWhyLabsInstruction}
    ${installPandasInstruction}

import pandas as pd
import os
import whylogs as why

os.environ["WHYLABS_DEFAULT_ORG_ID"] = "${orgIdPlaceholder}" # ORG-ID is case sensitive
os.environ["WHYLABS_API_KEY"] = "${tokenPlaceholder}"
os.environ["WHYLABS_DEFAULT_DATASET_ID"] = "${modelIdPlaceholder}" # The selected project "${modelNamePlaceholder}" is "${modelIdPlaceholder}"

# Point to your local CSV if you have your own data
df = pd.read_csv("https://whylabs-public.s3.us-west-2.amazonaws.com/datasets/tour/current.csv")

#log dataframe
results = why.log(df)

#upload results to WhyLabs
results.writer("whylabs").write()`;
  },

  flask: (): string => {
    return `### First, install the latest whylogs version
### pip install -q 'whylogs'

### The code snippet shown here can be used in the Flask or SageMaker example.
### You can find additional Flask instructions at:
### https://github.com/whylabs/whylogs/blob/mainline/python/examples/integrations/flask_streaming/flask_with_whylogs.ipynb

from typing import Collection, Dict, Tuple

import app  # type: ignore
from flask import Blueprint, request
from flask_pydantic import validate  # type: ignore
from schemas import FeatureVector  # type: ignore
from utils import object_response  # type: ignore

from api.utils import get_prediction, initialize_logger  # type: ignore

blueprint = Blueprint("api", __name__, url_prefix="/api/v1")
initialize_logger()

@blueprint.route("/health", methods=["GET"])
def health() -> Tuple[dict[str, Collection[str]], int]:
    return object_response({"state": "healthy"}, 200)

@blueprint.route("/predict", methods=["POST"])
@validate()
def predict(body: FeatureVector) -> Tuple[Dict[str, Collection[str]], int]:
    # Predict the output given the input vector
    vector = [
        body.sepal_length_cm,
        body.sepal_width_cm,
        body.petal_length_cm,
        body.petal_width_cm,
    ]
    pred = get_prediction(vector)

    # Log input vector as dictionary
    app.why_logger.log(request.json)  # type: ignore
    # Log predicted class
    app.why_logger.log({"class": pred})  # type: ignore
    return object_response({"class": pred}, 200)`;
  },

  mlflow: `### Install whylogs with the mlflow extra:
### pip install -q 'whylogs[mlflow]'
### For a full example check out this notebook: https://github.com/whylabs/whylogs/blob/mainline/python/examples/integrations/Mlflow_Logging.ipynb

import mlflow
import whylogs as why

with mlflow.start_run(run_name="whylogs demo"):
  # make the prediction and compute error
  predicted_output = model.predict(batch)
  mae = mean_absolute_error(actuals, predicted_output)

  # standard MLflow tracking APIs
  mlflow.log_params(model_params)
  mlflow.log_metric("mae", mae)

  # profiling the data
  profile_result = why.log(batch)

  # write to mlflow
  profile_result.writer("mlflow").write()

  # write to whylabs platform
  profile_result.writer("whylabs").write()

  mlflow.end_run()`,
  sagemaker: `### First, install the latest whylogs version:
### pip install -q 'whylogs'

### The code snippet shown here can be used in the SageMaker or Flask example.
### However, you will need to follow the detailed SageMaker deployment instructions at:
### https://github.com/whylabs/whylogs/tree/mainline/python/examples/integrations/sagemaker_whylabs_example

import app
from api.utils import get_prediction, initialize_logger
from flask import Blueprint, request
from flask_pydantic import validate
from schemas import FeatureVector
from utils import object_response

blueprint = Blueprint("api", __name__, url_prefix="/api/v1")
initialize_logger()

@blueprint.route("/predict", methods=["POST"])
@validate()
def predict(body: FeatureVector):
    # Predict the output given the input vector
    vector = [
        body.sepal_length_cm,
        body.sepal_width_cm,
        body.petal_length_cm,
        body.petal_width_cm,
    ]
    pred = get_prediction(vector)
    # Log to WhyLabs platform
    # Log input vector as dictionary
    app.whylabs_logger.log(request.json)
    # Log predicted class
    app.whylabs_logger.log({"class": pred})
    return object_response({"class": pred}, 200)`,
  spark: `### Be sure to install the latest whylogs with whylabs and spark extras:
### pip install -q  'whylogs[whylabs, spark]'
### You can find additional Spark instructions at:
### https://github.com/whylabs/whylogs/blob/mainline/python/examples/integrations/Pyspark_Profiling.ipynb

from whylogs.api.pyspark.experimental import collect_dataset_profile_view

dataset_profile_view = collect_dataset_profile_view(input_df=spark_dataframe)`,
};

export const LiveCodeExamples = {
  current: (orgId?: string, modelId?: string, accessToken?: string): string => {
    const modelIdPlaceholder = modelId ?? 'MODEL-ID';
    const orgIdPlaceholder = orgId ?? 'YOUR-ORG-ID';
    const tokenPlaceholder = accessToken ?? 'YOUR-API-KEY';

    return `${installWhyLabsInstruction}
    ${installPandasInstruction}

import pandas as pd
import os
import whylogs as why

os.environ["WHYLABS_API_KEY"] = "${tokenPlaceholder}"
os.environ["WHYLABS_DEFAULT_ORG_ID"] = "${orgIdPlaceholder}"
os.environ["WHYLABS_DEFAULT_DATASET_ID"] = "${modelIdPlaceholder}"

# We have provided you with several days worth of reference data,
# as well as current data.
uri = "https://whylabs-public.s3.us-west-2.amazonaws.com/datasets/tour"

# Run whylogs on current data and upload to WhyLabs.
df = pd.read_csv(f"{uri}/current.csv")
results = why.log(df)
results.writer("whylabs").write()
`;
  },
  historic: (orgId?: string, modelId?: string, modelName?: string, accessToken?: string): string => {
    const modelNamePlaceholder = modelName ?? 'MODEL-NAME';
    const modelIdPlaceholder = modelId ?? 'MODEL-ID';
    const orgIdPlaceholder = orgId ?? 'YOUR-ORG-ID';
    const tokenPlaceholder = accessToken ?? 'YOUR-API-KEY';

    return `${installWhyLabsInstruction}
    ${installPandasInstruction}

import pandas as pd
import os
import whylogs as why

from datetime import datetime, timedelta, timezone

os.environ["WHYLABS_API_KEY"] = "${tokenPlaceholder}"
os.environ["WHYLABS_DEFAULT_ORG_ID"] = "${orgIdPlaceholder}"
os.environ["WHYLABS_DEFAULT_DATASET_ID"] = "${modelIdPlaceholder}" # The selected model resource "${modelNamePlaceholder}" is "${modelIdPlaceholder}"

# We have provided you with several days worth of reference data,
# as well as current data.
uri = "https://whylabs-public.s3.us-west-2.amazonaws.com/datasets/tour"

# Run whylogs on historical data and upload to WhyLabs.
# Stick to data from the prior seven days for now.
now = datetime.now(tz=timezone.utc)
for day in range(1, 7):
    timestamp = now - timedelta(days=day)
    results = why.log(df)
    results.profile().set_dataset_timestamp(timestamp)
    results.writer("whylabs").write()
`;
  },
};
