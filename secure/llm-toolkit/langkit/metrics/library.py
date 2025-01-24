from functools import partial
from typing import List, Optional, Set

from typing_extensions import NotRequired, TypedDict, Unpack

from langkit.core.metric import MetricCreator
from langkit.openai.hallucination_types import OpenAIChoiceArg
from langkit.transformer import EmbeddingChoiceArg
from whylabs_llm_toolkit.data.labels import Labels
from whylabs_llm_toolkit.data.scripts.targets import AssetStage
from whylabs_llm_toolkit.settings import get_settings


class InjectionOptions(TypedDict):
    stage: NotRequired[Optional[AssetStage]]
    pca_stage: NotRequired[Optional[AssetStage]]
    version: NotRequired[Optional[int]]
    pca_version: NotRequired[Optional[int]]
    neighbors_num: NotRequired[Optional[int]]
    embedding: NotRequired[EmbeddingChoiceArg]
    return_neighbors: NotRequired[bool]
    tag: NotRequired[Optional[str]]
    filter_innocuous: NotRequired[bool]
    additional_data_url: NotRequired[Optional[str]]
    twoclass: NotRequired[bool]


class SimilarityTopicsOptions(TypedDict):
    stage: NotRequired[Optional[AssetStage]]
    pca_stage: NotRequired[Optional[AssetStage]]
    version: NotRequired[Optional[int]]
    pca_version: NotRequired[Optional[int]]
    neighbors_num: NotRequired[Optional[int]]
    embedding: NotRequired[EmbeddingChoiceArg]
    return_neighbors: NotRequired[bool]
    tag: NotRequired[Optional[str]]
    additional_data_url: NotRequired[Optional[str]]
    twoclass: NotRequired[bool]


class TokenCountOptions(TypedDict):
    tiktoken_encoding: NotRequired[Optional[str]]


class PresetOptions(TypedDict):
    prompt: NotRequired[bool]
    response: NotRequired[bool]


class PiiOptions(TypedDict):
    entities: NotRequired[Optional[List[str]]]
    input_name: NotRequired[str]


class ToxicityScoreOptions(TypedDict):
    onnx: NotRequired[bool]
    onnx_tag: NotRequired[Optional[str]]
    onnx_version: NotRequired[Optional[int]]
    hf_model: NotRequired[Optional[str]]
    hf_model_revision: NotRequired[Optional[str]]
    use_experimental_models: NotRequired[bool]
    version: NotRequired[Optional[int]]
    stage: NotRequired[Optional[AssetStage]]
    embedding: NotRequired[EmbeddingChoiceArg]
    filter_innocuous: NotRequired[bool]


class HallucinationScoreOptions(TypedDict):
    embedding: NotRequired[EmbeddingChoiceArg]
    llm_choice: NotRequired[Optional[OpenAIChoiceArg]]
    num_samples: NotRequired[Optional[int]]
    openai_model: NotRequired[Optional[str]]


class RefusalOptions(TypedDict):
    embedding: NotRequired[EmbeddingChoiceArg]
    additional_data_path: NotRequired[Optional[str]]


class TopicsOptions(TypedDict):
    topics: List[str]
    hypothesis_template: NotRequired[Optional[str]]
    onnx: NotRequired[bool]
    use_experimental_models: NotRequired[bool]
    stage: NotRequired[Optional[AssetStage]]
    version: NotRequired[Optional[int]]
    embedding: NotRequired[Optional[EmbeddingChoiceArg]]


class CreateTopicMetricOptions(TypedDict):
    column_name: str
    topics: List[str]
    hypothesis_template: NotRequired[Optional[str]]
    onnx: NotRequired[bool]
    use_experimental_models: NotRequired[bool]
    force_zero_shot: NotRequired[bool]
    zero_shot_revision: NotRequired[Optional[str]]
    stage: NotRequired[Optional[AssetStage]]
    version: NotRequired[Optional[int]]
    embedding: NotRequired[Optional[EmbeddingChoiceArg]]


class CustomColumnSimilarityOptions(TypedDict):
    CUSTOM_COLUMN: str
    CUSTOM_COLUMN_2: str
    embedding: NotRequired[EmbeddingChoiceArg]


class CoordinatesOptions(TypedDict):
    embedding: NotRequired[EmbeddingChoiceArg]
    stage: NotRequired[Optional[AssetStage]]
    version: NotRequired[Optional[int]]


class EmbeddingOptions(TypedDict):
    embedding: NotRequired[EmbeddingChoiceArg]


class PromptSimilarityCustomColumnOptions(TypedDict):
    CUSTOM_COLUMN: str
    embedding: NotRequired[EmbeddingChoiceArg]


class ResponseSimilarityCustomColumnOptions(TypedDict):
    CUSTOM_COLUMN: str
    embedding: NotRequired[EmbeddingChoiceArg]


class lib:
    class presets:
        @staticmethod
        def all(**kwargs: Unpack[PresetOptions]) -> MetricCreator:
            prompt = kwargs.get("prompt", True)
            response = kwargs.get("response", True)

            from langkit.metrics.input_output_similarity import prompt_response_input_output_similarity_metric
            from langkit.metrics.pii import prompt_presidio_pii_metric, response_presidio_pii_metric
            from langkit.metrics.regexes.regexes import prompt_regex_metric, response_regex_metric
            from langkit.metrics.sentiment_polarity import prompt_sentiment_polarity, response_sentiment_polarity
            from langkit.metrics.text_statistics import prompt_textstat_metric, response_textstat_metric
            from langkit.metrics.token import prompt_token_metric, response_token_metric

            prompt_metrics = [
                prompt_textstat_metric,
                prompt_token_metric,
                prompt_regex_metric,
                prompt_sentiment_polarity,
                lib.prompt.toxicity(),
                prompt_response_input_output_similarity_metric,
                lib.prompt.similarity.context(),
                lib.prompt.similarity.injection(),
                lib.prompt.similarity.code(),
                lib.prompt.similarity.medical(),
                lib.prompt.similarity.financial(),
                lib.prompt.similarity.toxic(),
                lib.prompt.similarity.hate(),
                lib.prompt.similarity.innocuous(),
                prompt_presidio_pii_metric,
                lib.prompt.topics.medical(),
                lib.prompt.topics.financial(),
                lib.prompt.topics.code(),
                lib.prompt.topics.malicious(),
            ]

            response_metrics = [
                response_textstat_metric,
                response_token_metric,
                response_regex_metric,
                response_sentiment_polarity,
                lib.response.similarity.refusal(),
                response_presidio_pii_metric,
                lib.response.toxicity(),
                lib.response.similarity.code(),
                lib.response.similarity.medical(),
                lib.response.similarity.financial(),
                lib.response.similarity.toxic(),
                lib.response.similarity.hate(),
                lib.response.similarity.innocuous(),
                lib.response.similarity.context(),
                lib.response.topics.medical(),
                lib.response.topics.financial(),
                lib.response.topics.code(),
                lib.response.topics.malicious(),
            ]

            return [
                *(prompt_metrics if prompt else []),
                *(response_metrics if response else []),
            ]

        @staticmethod
        def recommended(**kwargs: Unpack[PresetOptions]) -> MetricCreator:
            """
            These are the recommended set of metrics for the prompt and response. It pulls in the following groups of metrics:

            - prompt.pii.*
            - prompt.stats.token_count
            - prompt.stats.char_count
            - prompt.similarity.injection

            - response.pii.*
            - response.stats.token_count
            - response.stats.char_count
            - response.stats.flesch_reading_ease
            - response.sentiment.sentiment_score
            - response.toxicity.toxicity_score
            - response.similarity.refusal
            """
            prompt = kwargs.get("prompt", True)
            response = kwargs.get("response", True)

            prompt_metrics = [
                lib.prompt.pii,
                lib.prompt.stats.token_count,
                lib.prompt.stats.char_count,
                lib.prompt.similarity.injection,
            ]

            response_metrics = [
                lib.response.pii,
                lib.response.stats.token_count,
                lib.response.stats.char_count,
                lib.response.stats.flesch_reading_ease,
                lib.response.sentiment.sentiment_score,
                lib.response.toxicity.toxicity_score,
                lib.response.similarity.refusal,
            ]

            return [
                *(prompt_metrics if prompt else []),
                *(response_metrics if response else []),
            ]

    class CUSTOM_COLUMN:
        """
        These metrics don't assume column names
        """

        class similarity:
            def __call__(self, **kwargs: Unpack[CustomColumnSimilarityOptions]) -> MetricCreator:
                return [self.CUSTOM_COLUMN_2(**kwargs)]

            @staticmethod
            def CUSTOM_COLUMN_2(**kwargs: Unpack[CustomColumnSimilarityOptions]) -> MetricCreator:
                """
                Analyze the similarity between the custom_column and a custom column_2. The output of this metric ranges from 0 to 1,
                where 0 indicates no similarity and 1 indicates a high similarity.
                """
                from langkit.metrics.input_output_similarity import input_output_similarity_metric

                CUSTOM_COLUMN = kwargs["CUSTOM_COLUMN"]
                CUSTOM_COLUMN_2 = kwargs["CUSTOM_COLUMN_2"]
                embedding = kwargs.get("embedding", "default")

                return partial(
                    input_output_similarity_metric,
                    embedding=embedding,
                    output_column_name=CUSTOM_COLUMN,
                    input_column_name=CUSTOM_COLUMN_2,
                )

    class prompt:
        class pca:
            @staticmethod
            def coordinates(**kwargs: Unpack[CoordinatesOptions]) -> MetricCreator:
                from langkit.metrics.pca_metric import pca_metric

                embedding = kwargs.get("embedding", "default")
                stage = kwargs.get("stage")
                version = kwargs.get("version")

                return partial(pca_metric, column_name="prompt", choice=embedding, stage=stage, version=version)

        @staticmethod
        def pii(**kwargs: Unpack[PiiOptions]) -> MetricCreator:
            """
            Analyze the input for Personally Identifiable Information (PII) using Presidio. This group contains
            various pii metrics that check for email address, phone number, credit card number, etc. The pii metrics
            can't be used individually for performance reasons. If you want to customize the entities to check for
            then use the `entities` parameter.

            :param entities: The list of entities to analyze for. See https://microsoft.github.io/presidio/supported_entities/.
            :return: The MetricCreator
            """
            entities = kwargs.get("entities")
            input_name = kwargs.get("input_name", "prompt")

            from langkit.metrics.pii import pii_presidio_metric, prompt_presidio_pii_metric

            if entities:
                return partial(pii_presidio_metric, entities=entities, input_name=input_name)

            return prompt_presidio_pii_metric

        class toxicity:
            def __call__(self) -> MetricCreator:
                return self.toxicity_score()

            @staticmethod
            def toxicity_score(**kwargs: Unpack[ToxicityScoreOptions]) -> MetricCreator:
                """
                Analyze the input for toxicity. The output of this metric ranges from 0 to 1, where 0 indicates
                non-toxic and 1 indicates toxic.

                :param onnx: Whether to use the ONNX model for toxicity analysis. This is mutually exclusive with model options.
                :param hf_model: The Hugging Face model to use for toxicity analysis. Defaults to martin-ha/toxic-comment-model
                :param hf_model_revision: The revision of the Hugging Face model to use. This default can change between releases so you
                    can specify the revision to lock it to a specific version.
                """
                onnx = kwargs.get("onnx", True)
                onnx_tag = kwargs.get("onnx_tag")
                onnx_version = kwargs.get("onnx_version")
                hf_model = kwargs.get("hf_model")
                hf_model_revision = kwargs.get("hf_model_revision")
                use_experimental_models = kwargs.get("use_experimental_models", False)
                version = kwargs.get("version")
                stage = kwargs.get("stage")
                embedding = kwargs.get("embedding", "default")
                filter_innocuous = kwargs.get("filter_innocuous", False)

                if use_experimental_models:
                    from langkit.metrics.toxicity_setfit import toxicity_setfit_metric

                    return partial(
                        toxicity_setfit_metric,
                        column_name="prompt",
                        choice=embedding,
                        stage=stage,
                        version=version,
                        filter_innocuous=filter_innocuous,
                    )
                elif onnx:
                    from langkit.metrics.toxicity_onnx import prompt_toxicity_metric

                    return partial(prompt_toxicity_metric, tag=onnx_tag, version=onnx_version)
                else:
                    from langkit.metrics.toxicity import prompt_toxicity_metric

                    return partial(prompt_toxicity_metric, hf_model=hf_model, hf_model_revision=hf_model_revision)

        class stats:
            def __call__(self) -> MetricCreator:
                from langkit.metrics.text_statistics import prompt_textstat_metric

                return [lib.prompt.stats.token_count, prompt_textstat_metric]

            @staticmethod
            def char_count() -> MetricCreator:
                from langkit.metrics.text_statistics import prompt_char_count_metric

                return prompt_char_count_metric

            @staticmethod
            def flesch_reading_ease() -> MetricCreator:
                from langkit.metrics.text_statistics import prompt_reading_ease_metric

                return prompt_reading_ease_metric

            @staticmethod
            def grade() -> MetricCreator:
                from langkit.metrics.text_statistics import prompt_grade_metric

                return prompt_grade_metric

            @staticmethod
            def syllable_count() -> MetricCreator:
                from langkit.metrics.text_statistics import prompt_syllable_count_metric

                return prompt_syllable_count_metric

            @staticmethod
            def lexicon_count() -> MetricCreator:
                from langkit.metrics.text_statistics import prompt_lexicon_count_metric

                return prompt_lexicon_count_metric

            @staticmethod
            def sentence_count() -> MetricCreator:
                from langkit.metrics.text_statistics import prompt_sentence_count_metric

                return prompt_sentence_count_metric

            @staticmethod
            def letter_count() -> MetricCreator:
                from langkit.metrics.text_statistics import prompt_letter_count_metric

                return prompt_letter_count_metric

            @staticmethod
            def difficult_words() -> MetricCreator:
                from langkit.metrics.text_statistics import prompt_difficult_words_metric

                return prompt_difficult_words_metric

            @staticmethod
            def token_count(**kwargs: Unpack[TokenCountOptions]) -> MetricCreator:
                """
                Analyze the input for the number of tokens. This metric uses the `tiktoken` library to tokenize the input for
                the cl100k_base encoding by default (the encoding for gpt-3.5 and gpt-4).
                """
                from langkit.metrics.token import prompt_token_metric, token_metric

                if kwargs.get("tiktoken_encoding"):
                    return partial(token_metric, column_name="prompt", encoding=kwargs.get("tiktoken_encoding"))

                return prompt_token_metric

        class util:
            @staticmethod
            def embedding(**kwargs: Unpack[EmbeddingOptions]) -> MetricCreator:
                from langkit.metrics.embedding_generation import embedding_generation

                choice = kwargs.get("embedding", "default")

                return partial(embedding_generation, choice=choice, column_name="prompt")

        class regex:
            def __call__(self) -> MetricCreator:
                from langkit.metrics.regexes.regexes import prompt_regex_metric

                return prompt_regex_metric

            @staticmethod
            def ssn() -> MetricCreator:
                from langkit.metrics.regexes.regexes import prompt_ssn_regex_metric

                return prompt_ssn_regex_metric

            @staticmethod
            def phone_number() -> MetricCreator:
                from langkit.metrics.regexes.regexes import prompt_phone_number_regex_metric

                return prompt_phone_number_regex_metric

            @staticmethod
            def email_address() -> MetricCreator:
                from langkit.metrics.regexes.regexes import prompt_email_address_regex_metric

                return prompt_email_address_regex_metric

            @staticmethod
            def mailing_address() -> MetricCreator:
                from langkit.metrics.regexes.regexes import prompt_mailing_address_regex_metric

                return prompt_mailing_address_regex_metric

            @staticmethod
            def credit_card_number() -> MetricCreator:
                from langkit.metrics.regexes.regexes import prompt_credit_card_number_regex_metric

                return prompt_credit_card_number_regex_metric

            @staticmethod
            def url() -> MetricCreator:
                from langkit.metrics.regexes.regexes import prompt_url_regex_metric

                return prompt_url_regex_metric

        class similarity:
            """
            These metrics are used to compare the response to various examples and use cosine similarity/embedding distances
            to determine the similarity between the response and the examples.
            """

            def __call__(self) -> MetricCreator:
                return [
                    self.injection(),
                    self.context(),
                ]

            @staticmethod
            def CUSTOM_COLUMN(**kwargs: Unpack[PromptSimilarityCustomColumnOptions]) -> MetricCreator:
                """
                Analyze the similarity between the prompt and a custom column. The output of this metric ranges from 0 to 1,
                where 0 indicates no similarity and 1 indicates a high similarity.
                """
                from langkit.metrics.input_output_similarity import input_output_similarity_metric

                CUSTOM_COLUMN = kwargs["CUSTOM_COLUMN"]
                embedding = kwargs.get("embedding", "default")

                return partial(
                    input_output_similarity_metric,
                    embedding=embedding,
                    output_column_name="prompt",
                    input_column_name=CUSTOM_COLUMN,
                )

            @staticmethod
            def injection(**kwargs: Unpack[InjectionOptions]) -> MetricCreator:
                """
                Analyze the input for injection themes. The injection score is a measure of how similar the input is
                to known injection examples, where 0 indicates no similarity and 1 indicates a high similarity. Returns nearest
                neighbor for an injection when requested.
                """
                from langkit.metrics.injections_chroma_twoclass import injections_twoclass_metric_chroma

                twoclass = kwargs.get("twoclass", True)
                if twoclass:
                    return lambda: injections_twoclass_metric_chroma(
                        column_name="prompt",
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        filter_innocuous=kwargs.get("filter_innocuous"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )
                else:
                    from langkit.metrics.injections_chroma import injections_metric_chroma

                    return lambda: injections_metric_chroma(
                        column_name="prompt",
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        filter_innocuous=kwargs.get("filter_innocuous"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )

            @staticmethod
            def code(**kwargs: Unpack[SimilarityTopicsOptions]) -> MetricCreator:
                """
                Analyze the input for code themes. The score is a measure of how similar the input is
                to known code examples, where 0 indicates no similarity and 1 indicates a high similarity. Returns nearest
                neighbor for a code sample when requested.
                """
                from langkit.metrics.topic_chroma import topic_chroma_metric

                twoclass = kwargs.get("twoclass", False)
                if twoclass:
                    from langkit.metrics.topic_twoclass_chroma import topic_chroma_twoclass_metric

                    return lambda: topic_chroma_twoclass_metric(
                        column_name="prompt",
                        topic=Labels.code,
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )
                else:
                    return lambda: topic_chroma_metric(
                        column_name="prompt",
                        topic=Labels.code,
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )

            @staticmethod
            def medical(**kwargs: Unpack[SimilarityTopicsOptions]) -> MetricCreator:
                """
                Analyze the input for medical themes. The score is a measure of how similar the input is
                to known medical examples, where 0 indicates no similarity and 1 indicates a high similarity. Returns nearest
                neighbor for a medical sample when requested.
                """
                from langkit.metrics.topic_chroma import topic_chroma_metric

                twoclass = kwargs.get("twoclass", False)

                if twoclass:
                    from langkit.metrics.topic_twoclass_chroma import topic_chroma_twoclass_metric

                    return lambda: topic_chroma_twoclass_metric(
                        column_name="prompt",
                        topic=Labels.medical,
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )
                else:
                    return lambda: topic_chroma_metric(
                        column_name="prompt",
                        topic=Labels.medical,
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )

            @staticmethod
            def financial(**kwargs: Unpack[SimilarityTopicsOptions]) -> MetricCreator:
                """
                Analyze the input for financial themes. The score is a measure of how similar the input is
                to known financial examples, where 0 indicates no similarity and 1 indicates a high similarity. Returns nearest
                neighbor for a financial sample when requested.
                """
                from langkit.metrics.topic_chroma import topic_chroma_metric

                twoclass = kwargs.get("twoclass", False)

                if twoclass:
                    from langkit.metrics.topic_twoclass_chroma import topic_chroma_twoclass_metric

                    return lambda: topic_chroma_twoclass_metric(
                        column_name="prompt",
                        topic=Labels.financial,
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )
                else:
                    return lambda: topic_chroma_metric(
                        column_name="prompt",
                        topic=Labels.financial,
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )

            @staticmethod
            def toxic(**kwargs: Unpack[SimilarityTopicsOptions]) -> MetricCreator:
                """
                Analyze the input for toxic themes. The score is a measure of how similar the input is
                to known toxic examples, where 0 indicates no similarity and 1 indicates a high similarity. Returns nearest
                neighbor for a toxic sample when requested.
                """
                from langkit.metrics.topic_chroma import topic_chroma_metric

                twoclass = kwargs.get("twoclass", False)

                if twoclass:
                    from langkit.metrics.topic_twoclass_chroma import topic_chroma_twoclass_metric

                    return lambda: topic_chroma_twoclass_metric(
                        column_name="prompt",
                        topic=Labels.toxic,
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )
                else:
                    return lambda: topic_chroma_metric(
                        column_name="prompt",
                        topic=Labels.toxic,
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )

            @staticmethod
            def hate(**kwargs: Unpack[SimilarityTopicsOptions]) -> MetricCreator:
                """
                Analyze the input for hate themes. The score is a measure of how similar the input is
                to known hate examples, where 0 indicates no similarity and 1 indicates a high similarity. Returns nearest
                neighbor for a hate sample when requested.
                """
                from langkit.metrics.topic_chroma import topic_chroma_metric

                twoclass = kwargs.get("twoclass", False)

                if twoclass:
                    from langkit.metrics.topic_twoclass_chroma import topic_chroma_twoclass_metric

                    return lambda: topic_chroma_twoclass_metric(
                        column_name="prompt",
                        topic=Labels.hate,
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )
                else:
                    return lambda: topic_chroma_metric(
                        column_name="prompt",
                        topic=Labels.hate,
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )

            @staticmethod
            def innocuous(**kwargs: Unpack[SimilarityTopicsOptions]) -> MetricCreator:
                """
                Analyze the input for innocuous themes. The score is a measure of how similar the input is
                to known innocuous examples, where 0 indicates no similarity and 1 indicates a high similarity. Returns nearest
                neighbor for an innocuous sample when requested.
                """
                from langkit.metrics.topic_chroma import topic_chroma_metric

                twoclass = kwargs.get("twoclass", False)

                if twoclass:
                    from langkit.metrics.topic_twoclass_chroma import topic_chroma_twoclass_metric

                    return lambda: topic_chroma_twoclass_metric(
                        column_name="prompt",
                        topic=Labels.innocuous,
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )
                else:
                    return lambda: topic_chroma_metric(
                        column_name="prompt",
                        topic=Labels.innocuous,
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )

            @staticmethod
            def context(embedding: EmbeddingChoiceArg = "default") -> MetricCreator:
                from langkit.metrics.input_context_similarity import input_context_similarity

                return partial(input_context_similarity, embedding=embedding)

        class sentiment:
            def __call__(self) -> MetricCreator:
                return self.sentiment_score()

            @staticmethod
            def sentiment_score() -> MetricCreator:
                """
                Analyze the sentiment of the response. The output of this metric ranges from -1 to 1, where -1
                indicates a negative sentiment and 1 indicates a positive sentiment.
                """
                from langkit.metrics.sentiment_polarity import prompt_sentiment_polarity

                return prompt_sentiment_polarity

        class topics:
            def __init__(self, **kwargs: Unpack[TopicsOptions]):
                self.topics = kwargs["topics"]
                self.hypothesis_template = kwargs.get("hypothesis_template")
                self.onnx = kwargs.get("onnx", True)
                settings = get_settings()
                self.use_experimental_models = kwargs.get("use_experimental_models", settings.USE_EXPERIMENTAL_MODELS)
                self.stage: Optional[AssetStage] = kwargs.get("stage")
                self.version = kwargs.get("version")
                self.embedding: Optional[EmbeddingChoiceArg] = kwargs.get("embedding")

            def __call__(self) -> MetricCreator:
                return _create_topic_metric(
                    column_name="prompt",
                    topics=self.topics,
                    hypothesis_template=self.hypothesis_template,
                    onnx=self.onnx,
                    use_experimental_models=self.use_experimental_models,
                    stage=self.stage,
                    version=self.version,
                    embedding=self.embedding,
                )

            @staticmethod
            def medical(onnx: bool = True, use_experimental_models: bool = False) -> MetricCreator:
                settings = get_settings()
                if use_experimental_models or settings.USE_EXPERIMENTAL_MODELS:
                    from langkit.metrics.topic_toolkit import topic_metric

                    return partial(topic_metric, column_name="prompt", medical=True, financial=False, code=False)
                else:
                    from langkit.metrics.topic import topic_metric

                    return lambda: topic_metric("prompt", ["medical"], use_onnx=onnx)

            @staticmethod
            def financial(onnx: bool = True, use_experimental_models: bool = False) -> MetricCreator:
                settings = get_settings()
                if use_experimental_models or settings.USE_EXPERIMENTAL_MODELS:
                    from langkit.metrics.topic_toolkit import topic_metric

                    return partial(topic_metric, column_name="prompt", medical=False, financial=True, code=False)
                else:
                    from langkit.metrics.topic import topic_metric

                    return lambda: topic_metric("prompt", ["financial"], use_onnx=onnx)

            @staticmethod
            def code(onnx: bool = True, use_experimental_models: bool = False) -> MetricCreator:
                settings = get_settings()
                if use_experimental_models or settings.USE_EXPERIMENTAL_MODELS:
                    from langkit.metrics.topic_toolkit import topic_metric

                    return partial(topic_metric, column_name="prompt", medical=False, financial=False, code=True)
                else:
                    from langkit.metrics.topic import topic_metric

                    return lambda: topic_metric("prompt", ["code"], use_onnx=onnx)

            @staticmethod
            def malicious():
                from langkit.metrics.malicious import malicious_metric

                return partial(malicious_metric, column_name="prompt")

    class response:
        class hallucination:
            @staticmethod
            def hallucination_score(**kwargs: Unpack[HallucinationScoreOptions]) -> MetricCreator:
                embedding = kwargs.get("embedding", "default")
                llm_choice = kwargs.get("llm_choice")
                num_samples = kwargs.get("num_samples")
                openai_model = kwargs.get("openai_model")

                from langkit.metrics.response_hallucination import prompt_response_hallucination_metric

                return partial(
                    prompt_response_hallucination_metric,
                    embedding=embedding,
                    llm_choice=llm_choice,
                    num_samples=num_samples,
                    openai_model=openai_model,
                )

        class pca:
            @staticmethod
            def coordinates(**kwargs: Unpack[CoordinatesOptions]) -> MetricCreator:
                from langkit.metrics.pca_metric import pca_metric

                embedding = kwargs.get("embedding", "default")
                stage = kwargs.get("stage")
                version = kwargs.get("version")

                return partial(pca_metric, column_name="response", choice=embedding, stage=stage, version=version)

        @staticmethod
        def pii(**kwargs: Unpack[PiiOptions]) -> MetricCreator:
            """
            Analyze the input for Personally Identifiable Information (PII) using Presidio. This group contains
            various pii metrics that check for email address, phone number, credit card number, etc. The pii metrics
            can't be used individually for performance reasons. If you want to customize the entities to check for
            then use the `entities` parameter.

            :param entities: The list of entities to analyze for. See https://microsoft.github.io/presidio/supported_entities/.
            :return: The MetricCreator
            """
            entities = kwargs.get("entities")
            input_name = kwargs.get("input_name", "response")

            from langkit.metrics.pii import pii_presidio_metric, response_presidio_pii_metric

            if entities:
                return lambda: pii_presidio_metric(entities=entities, input_name=input_name)

            return response_presidio_pii_metric

        class toxicity:
            def __call__(self) -> MetricCreator:
                return self.toxicity_score()

            @staticmethod
            def toxicity_score(**kwargs: Unpack[ToxicityScoreOptions]) -> MetricCreator:
                """
                Analyze the toxicity of the response. The output of this metric ranges from 0 to 1, where 0
                indicates a non-toxic response and 1 indicates a toxic response.
                """
                onnx = kwargs.get("onnx", True)
                onnx_tag = kwargs.get("onnx_tag")
                onnx_version = kwargs.get("onnx_version")
                hf_model = kwargs.get("hf_model")
                hf_model_revision = kwargs.get("hf_model_revision")
                use_experimental_models = kwargs.get("use_experimental_models", False)
                version = kwargs.get("version")
                stage = kwargs.get("stage")
                embedding = kwargs.get("embedding", "default")
                filter_innocuous = kwargs.get("filter_innocuous", False)

                if use_experimental_models:
                    from langkit.metrics.toxicity_setfit import toxicity_setfit_metric

                    return partial(
                        toxicity_setfit_metric,
                        column_name="response",
                        choice=embedding,
                        stage=stage,
                        version=version,
                        filter_innocuous=filter_innocuous,
                    )
                elif onnx:
                    from langkit.metrics.toxicity_onnx import response_toxicity_metric

                    return partial(response_toxicity_metric, tag=onnx_tag, version=onnx_version)
                else:
                    from langkit.metrics.toxicity import response_toxicity_metric

                    return partial(response_toxicity_metric, hf_model=hf_model, hf_model_revision=hf_model_revision)

        class stats:
            def __call__(self) -> MetricCreator:
                from langkit.metrics.text_statistics import response_textstat_metric

                return [lib.response.stats.token_count, response_textstat_metric]

            @staticmethod
            def char_count() -> MetricCreator:
                from langkit.metrics.text_statistics import response_char_count_metric

                return response_char_count_metric

            @staticmethod
            def flesch_reading_ease() -> MetricCreator:
                from langkit.metrics.text_statistics import response_reading_ease_metric

                return response_reading_ease_metric

            @staticmethod
            def grade() -> MetricCreator:
                from langkit.metrics.text_statistics import response_grade_metric

                return response_grade_metric

            @staticmethod
            def syllable_count() -> MetricCreator:
                from langkit.metrics.text_statistics import response_syllable_count_metric

                return response_syllable_count_metric

            @staticmethod
            def lexicon_count() -> MetricCreator:
                from langkit.metrics.text_statistics import response_lexicon_count_metric

                return response_lexicon_count_metric

            @staticmethod
            def sentence_count() -> MetricCreator:
                from langkit.metrics.text_statistics import response_sentence_count_metric

                return response_sentence_count_metric

            @staticmethod
            def letter_count() -> MetricCreator:
                from langkit.metrics.text_statistics import response_letter_count_metric

                return response_letter_count_metric

            @staticmethod
            def difficult_words() -> MetricCreator:
                from langkit.metrics.text_statistics import response_difficult_words_metric

                return response_difficult_words_metric

            @staticmethod
            def token_count(**kwargs: Unpack[TokenCountOptions]) -> MetricCreator:
                """
                Analyze the input for the number of tokens. This metric uses the `tiktoken` library to tokenize the input for
                the cl100k_base encoding by default (the encoding for gpt-3.5 and gpt-4).
                """
                from langkit.metrics.token import response_token_metric, token_metric

                if kwargs.get("tiktoken_encoding"):
                    return lambda: token_metric(column_name="response", encoding=kwargs.get("tiktoken_encoding"))

                return response_token_metric

        class util:
            @staticmethod
            def embedding(**kwargs: Unpack[EmbeddingOptions]) -> MetricCreator:
                from langkit.metrics.embedding_generation import embedding_generation

                choice = kwargs.get("embedding", "default")

                return partial(embedding_generation, choice=choice, column_name="response")

        class regex:
            def __call__(self) -> MetricCreator:
                from langkit.metrics.regexes.regexes import response_regex_metric

                return response_regex_metric

            @staticmethod
            def refusal() -> MetricCreator:
                from langkit.metrics.regexes.regexes import response_refusal_regex_metric

                return response_refusal_regex_metric

            @staticmethod
            def ssn() -> MetricCreator:
                from langkit.metrics.regexes.regexes import response_ssn_regex_metric

                return response_ssn_regex_metric

            @staticmethod
            def phone_number() -> MetricCreator:
                from langkit.metrics.regexes.regexes import response_phone_number_regex_metric

                return response_phone_number_regex_metric

            @staticmethod
            def email_address() -> MetricCreator:
                from langkit.metrics.regexes.regexes import response_email_address_regex_metric

                return response_email_address_regex_metric

            @staticmethod
            def mailing_address() -> MetricCreator:
                from langkit.metrics.regexes.regexes import response_mailing_address_regex_metric

                return response_mailing_address_regex_metric

            @staticmethod
            def credit_card_number() -> MetricCreator:
                from langkit.metrics.regexes.regexes import response_credit_card_number_regex_metric

                return response_credit_card_number_regex_metric

            @staticmethod
            def url() -> MetricCreator:
                from langkit.metrics.regexes.regexes import response_url_regex_metric

                return response_url_regex_metric

        class sentiment:
            def __call__(self) -> MetricCreator:
                return self.sentiment_score()

            @staticmethod
            def sentiment_score() -> MetricCreator:
                """
                Analyze the sentiment of the response. The output of this metric ranges from -1 to 1, where -1
                indicates a negative sentiment and 1 indicates a positive sentiment.
                """
                from langkit.metrics.sentiment_polarity import response_sentiment_polarity

                return response_sentiment_polarity

        class similarity:
            """
            These metrics are used to compare the response to various examples and use cosine similarity/embedding distances
            to determine the similarity between the response and the examples.
            """

            def __call__(self) -> MetricCreator:
                return [
                    self.prompt(),
                    self.refusal(),
                    self.context(),
                ]

            @staticmethod
            def CUSTOM_COLUMN(**kwargs: Unpack[ResponseSimilarityCustomColumnOptions]) -> MetricCreator:
                """
                Analyze the similarity between the response and a custom column. The output of this metric ranges from 0 to 1,
                where 0 indicates no similarity and 1 indicates a high similarity.
                """
                from langkit.metrics.input_output_similarity import input_output_similarity_metric

                CUSTOM_COLUMN = kwargs["CUSTOM_COLUMN"]
                embedding = kwargs.get("embedding", "default")

                return partial(
                    input_output_similarity_metric,
                    embedding=embedding,
                    output_column_name="response",
                    input_column_name=CUSTOM_COLUMN,
                )

            @staticmethod
            def prompt(embedding: EmbeddingChoiceArg = "default") -> MetricCreator:
                """
                Analyze the similarity between the input and the response. The output of this metric ranges from 0 to 1,
                where 0 indicates no similarity and 1 indicates a high similarity.
                """
                from langkit.metrics.input_output_similarity import prompt_response_input_output_similarity_metric

                return partial(prompt_response_input_output_similarity_metric, embedding=embedding)

            @staticmethod
            def refusal(**kwargs: Unpack[RefusalOptions]) -> MetricCreator:
                """
                Analyze the response for refusal themes. The refusal score is a measure of how similar the response is
                to known refusal examples, where 0 indicates no similarity and 1 indicates a high similarity.
                """
                embedding = kwargs.get("embedding", "default")
                additional_data_path = kwargs.get("additional_data_path")

                from langkit.metrics.themes.themes import response_refusal_similarity_metric

                return partial(response_refusal_similarity_metric, embedding=embedding, additional_data_path=additional_data_path)

            @staticmethod
            def code(**kwargs: Unpack[SimilarityTopicsOptions]) -> MetricCreator:
                """
                Analyze the input for code themes. The score is a measure of how similar the input is
                to known code examples, where 0 indicates no similarity and 1 indicates a high similarity. Returns nearest
                neighbor for a code sample when requested.
                """
                from langkit.metrics.topic_chroma import topic_chroma_metric

                twoclass = kwargs.get("twoclass", False)

                if twoclass:
                    from langkit.metrics.topic_twoclass_chroma import topic_chroma_twoclass_metric

                    return lambda: topic_chroma_twoclass_metric(
                        column_name="response",
                        topic=Labels.code,
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )
                else:
                    return lambda: topic_chroma_metric(
                        column_name="response",
                        topic=Labels.code,
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )

            @staticmethod
            def medical(**kwargs: Unpack[SimilarityTopicsOptions]) -> MetricCreator:
                """
                Analyze the input for medical themes. The score is a measure of how similar the input is
                to known medical examples, where 0 indicates no similarity and 1 indicates a high similarity. Returns nearest
                neighbor for a medical sample when requested.
                """
                from langkit.metrics.topic_chroma import topic_chroma_metric

                twoclass = kwargs.get("twoclass", False)

                if twoclass:
                    from langkit.metrics.topic_twoclass_chroma import topic_chroma_twoclass_metric

                    return lambda: topic_chroma_twoclass_metric(
                        column_name="response",
                        topic=Labels.medical,
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )
                else:
                    return lambda: topic_chroma_metric(
                        column_name="response",
                        topic=Labels.medical,
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )

            @staticmethod
            def financial(**kwargs: Unpack[SimilarityTopicsOptions]) -> MetricCreator:
                """
                Analyze the input for financial themes. The score is a measure of how similar the input is
                to known financial examples, where 0 indicates no similarity and 1 indicates a high similarity. Returns nearest
                neighbor for a financial sample when requested.
                """
                from langkit.metrics.topic_chroma import topic_chroma_metric

                twoclass = kwargs.get("twoclass", False)

                if twoclass:
                    from langkit.metrics.topic_twoclass_chroma import topic_chroma_twoclass_metric

                    return lambda: topic_chroma_twoclass_metric(
                        column_name="response",
                        topic=Labels.financial,
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )
                else:
                    return lambda: topic_chroma_metric(
                        column_name="response",
                        topic=Labels.financial,
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )

            @staticmethod
            def toxic(**kwargs: Unpack[SimilarityTopicsOptions]) -> MetricCreator:
                """
                Analyze the input for toxic themes. The score is a measure of how similar the input is
                to known toxic examples, where 0 indicates no similarity and 1 indicates a high similarity. Returns nearest
                neighbor for a toxic sample when requested.
                """
                from langkit.metrics.topic_chroma import topic_chroma_metric

                twoclass = kwargs.get("twoclass", False)

                if twoclass:
                    from langkit.metrics.topic_twoclass_chroma import topic_chroma_twoclass_metric

                    return lambda: topic_chroma_twoclass_metric(
                        column_name="response",
                        topic=Labels.toxic,
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )
                else:
                    return lambda: topic_chroma_metric(
                        column_name="response",
                        topic=Labels.toxic,
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )

            @staticmethod
            def hate(**kwargs: Unpack[SimilarityTopicsOptions]) -> MetricCreator:
                """
                Analyze the input for hate themes. The score is a measure of how similar the input is
                to known hate examples, where 0 indicates no similarity and 1 indicates a high similarity. Returns nearest
                neighbor for a hate sample when requested.
                """
                from langkit.metrics.topic_chroma import topic_chroma_metric

                twoclass = kwargs.get("twoclass", False)

                if twoclass:
                    from langkit.metrics.topic_twoclass_chroma import topic_chroma_twoclass_metric

                    return lambda: topic_chroma_twoclass_metric(
                        column_name="response",
                        topic=Labels.hate,
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )
                else:
                    return lambda: topic_chroma_metric(
                        column_name="response",
                        topic=Labels.hate,
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )

            @staticmethod
            def innocuous(**kwargs: Unpack[SimilarityTopicsOptions]) -> MetricCreator:
                """
                Analyze the input for innocuous themes. The score is a measure of how similar the input is
                to known innocuous examples, where 0 indicates no similarity and 1 indicates a high similarity. Returns nearest
                neighbor for an innocuous sample when requested.
                """
                from langkit.metrics.topic_chroma import topic_chroma_metric

                twoclass = kwargs.get("twoclass", False)

                if twoclass:
                    from langkit.metrics.topic_twoclass_chroma import topic_chroma_twoclass_metric

                    return lambda: topic_chroma_twoclass_metric(
                        column_name="response",
                        topic=Labels.innocuous,
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )
                else:
                    return lambda: topic_chroma_metric(
                        column_name="response",
                        topic=Labels.innocuous,
                        stage=kwargs.get("stage"),
                        pca_stage=kwargs.get("pca_stage"),
                        choice=kwargs.get("embedding"),
                        version=kwargs.get("version"),
                        pca_version=kwargs.get("pca_version"),
                        neighbors_num=kwargs.get("neighbors_num"),
                        return_neighbors=kwargs.get("return_neighbors"),
                        additional_data_url=kwargs.get("additional_data_url"),
                    )

            @staticmethod
            def context(embedding: EmbeddingChoiceArg = "default") -> MetricCreator:
                from langkit.metrics.input_context_similarity import input_context_similarity

                return partial(input_context_similarity, embedding=embedding, input_column_name="response")

        class topics:
            def __init__(self, **kwargs: Unpack[TopicsOptions]):
                self.topics = kwargs["topics"]
                self.hypothesis_template = kwargs.get("hypothesis_template")
                self.onnx = kwargs.get("onnx", True)
                settings = get_settings()
                self.use_experimental_models = kwargs.get("use_experimental_models", settings.USE_EXPERIMENTAL_MODELS)
                self.stage: Optional[AssetStage] = kwargs.get("stage")
                self.version = kwargs.get("version")
                self.embedding_choice: Optional[EmbeddingChoiceArg] = kwargs.get("embedding_choice")

            def __call__(self) -> MetricCreator:
                return _create_topic_metric(
                    column_name="response",
                    topics=self.topics,
                    hypothesis_template=self.hypothesis_template,
                    onnx=self.onnx,
                    use_experimental_models=self.use_experimental_models,
                    stage=self.stage,
                    version=self.version,
                    embedding=self.embedding_choice,
                )

            @staticmethod
            def medical(onnx: bool = True, use_experimental_models: bool = False) -> MetricCreator:
                settings = get_settings()
                if use_experimental_models or settings.USE_EXPERIMENTAL_MODELS:
                    from langkit.metrics.topic_toolkit import topic_metric

                    return partial(topic_metric, column_name="response", medical=True, financial=False, code=False)
                else:
                    from langkit.metrics.topic import topic_metric

                    return lambda: topic_metric("response", ["medical"], use_onnx=onnx)

            @staticmethod
            def financial(onnx: bool = True, use_experimental_models: bool = False) -> MetricCreator:
                settings = get_settings()
                if use_experimental_models or settings.USE_EXPERIMENTAL_MODELS:
                    from langkit.metrics.topic_toolkit import topic_metric

                    return partial(topic_metric, column_name="response", medical=False, financial=True, code=False)
                else:
                    from langkit.metrics.topic import topic_metric

                    return lambda: topic_metric("response", ["financial"], use_onnx=onnx)

            @staticmethod
            def code(onnx: bool = True, use_experimental_models: bool = False) -> MetricCreator:
                settings = get_settings()
                if use_experimental_models or settings.USE_EXPERIMENTAL_MODELS:
                    from langkit.metrics.topic_toolkit import topic_metric

                    return partial(topic_metric, column_name="response", medical=False, financial=False, code=True)
                else:
                    from langkit.metrics.topic import topic_metric

                    return lambda: topic_metric("response", ["code"], use_onnx=onnx)

            @staticmethod
            def malicious():
                from langkit.metrics.malicious import malicious_metric

                return partial(malicious_metric, column_name="response")


def _create_topic_metric(**kwargs: Unpack[CreateTopicMetricOptions]):
    column_name = kwargs["column_name"]
    topics = kwargs["topics"]
    hypothesis_template = kwargs.get("hypothesis_template")
    onnx = kwargs.get("onnx", True)
    use_experimental_models = kwargs.get("use_experimental_models", False)
    force_zero_shot = kwargs.get("force_zero_shot", False)
    zero_shot_revision = kwargs.get("zero_shot_revision")
    stage = kwargs.get("stage")
    version = kwargs.get("version")
    embedding_choice = kwargs.get("embedding_choice")

    topic_set = set(topics)

    if force_zero_shot:
        # If zero_shot is set then use the zero shot model for everything. As we introduce more internal models for topics
        # we're going to set the defaults for those topics to be our own models. If people want to control that behavior themselves
        # then they can set zero_shot to True and they'll end up using the zero shot model for everything, then they can swap over
        # when they're ready.
        from langkit.metrics.topic import topic_metric as old_topic_metric

        return partial(old_topic_metric, column_name, topics, hypothesis_template, use_onnx=onnx, revision=zero_shot_revision)

    # if the topic set only contains medical, financial, or code
    elif topic_set.issubset(set(Labels._member_names_)) and use_experimental_models:
        from langkit.metrics.topic_setfit import topic_setfit_metric

        return partial(
            topic_setfit_metric,
            column_name=column_name,
            stage=stage,
            version=version,
            choice=embedding_choice,
        )

    else:
        # Otherwise we'll use the topic_metric version to handle just the medical, financial, and code and whatever is left
        # will be handled by the old topic metric
        from langkit.metrics.topic import topic_metric as old_topic_metric
        from langkit.metrics.topic_setfit import topic_setfit_metric

        experimental_topics: Set[str] = set(Labels._member_names_) if use_experimental_models else set()
        topics_without_mfc = sorted(list(topic_set - experimental_topics))

        metrics: List[MetricCreator] = []
        if topics_without_mfc:
            metrics.append(
                partial(old_topic_metric, column_name, topics_without_mfc, hypothesis_template, use_onnx=onnx, revision=zero_shot_revision)
            )

        # if it has any of the medical, financial, or code topics, we'll use the toolkit version to handle those
        if ("medical" in topic_set or "financial" in topic_set or "code" in topic_set) and use_experimental_models:
            metrics.append(
                partial(
                    topic_setfit_metric,
                    column_name=column_name,
                    stage=stage,
                    version=version,
                    choice=embedding_choice,
                )
            )

        return metrics
