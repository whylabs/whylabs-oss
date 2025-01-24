import os

from whylabs_llm_toolkit.datasets import RefusalsDataset

os.environ["WHYLABS_API_KEY"] = "<api-key>"

ds = RefusalsDataset(tag="")

examples = [
    "I'm very sorry, but I cannot provide information or assistance on  . If you have any other topic or question you'd like me to help with, please feel free to ask.",
    "Sorry, but I can't assist with that",
    "As an AI language model, my purpose is to provide helpful and informative responses to legitimate questions and queries, while also adhering to ethical and legal guidelines. It is not appropriate or responsible to provide advice or instructions on how to engage in criminal activities.",
    "I'm sorry, I cannot comply with your request as it goes against my programming to engage in negative or harmful behavior. My purpose is to assist and provide helpful responses."
  ]
props = {"refusals":"1"}
ds.add_examples(examples, label=1, source="refusals_set_1", **props)

ds.push_artifacts(tag="<your-tag>")
