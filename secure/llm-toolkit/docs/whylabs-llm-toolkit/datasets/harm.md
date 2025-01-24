# Harm Dataset

Tags: `main`, `beta_behaviors`

## main

Source groups:

- prompt_injections: This group was created using [1] as examples of harmful behaviors combined with [2] and [3] as examples of prompt injection/jailbreak attacks.

- adv_suffix: This group was created using [1] as examples of harmful behaviors appended with adversarial suffixes generated as described in [4]

- cipher: This group was created using [1] as examples of harmful behaviors encrypted using the cipher described in [5]

## beta_behaviors

- harmful_behaviors: Examples taken directly from [1]
- privacy_group_1: chatgpt-generated examples of privacy-related harmful behaviors, like asking for private information of celebrities.
- prompt_extractions: examples of prompt extraction attacks taken from https://arxiv.org/pdf/2307.06865
- attacks_group_1: examples of simple prompt injection attacks and harmful behaviors

**Source Datasets**

1. [Harmful Behaviors](s3://whylabs-datascience/datasets/harm-dataset/source_datasets/llm_attacks_harmful_behaviors.csv) - Examples taken from https://github.com/llm-attacks/llm-attacks/blob/main/data/advbench/harmful_behaviors.csv

2. [InjectionsDeepset](s3://whylabs-datascience/datasets/harm-dataset/source_datasets/injection_curated_train_final.csv) - Taken from https://huggingface.co/datasets/deepset/prompt-injections. Data is curated to remove duplicates and irrelevant examples.

3. [JailbreakChat](s3://whylabs-datascience/datasets/harm-dataset/source_datasets/jailbreak_chat_curated.json) - Taken from https://www.jailbreakchat.com/api/getprompts. Data is curated to remove duplicates and irrelevant examples.

4. Adversarial Suffixes [Train](s3://whylabs-datascience/datasets/harm-dataset/source_datasets/generated_patches_train.txt),[Test](s3://whylabs-datascience/datasets/harm-dataset/source_datasets/generated_patches_test.txt) - Based on https://github.com/llm-attacks (AI Generated based from original examples from the paper)

5. Cipher - Generated with code from https://arxiv.org/abs/2308.06463 using data from harmful behaviors [1]

6. [Prompt Extraction] - Taken from https://arxiv.org/pdf/2307.06865.pdf
