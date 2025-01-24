from typing import Any, Dict, Optional

from langkit.transformer import EmbeddingChoiceArg


class WorkflowOptionUtil:
    @staticmethod
    def get_embedding_choice(options: Dict[str, Any]) -> Optional[EmbeddingChoiceArg]:
        return options.get("embedding_choice", None)

    @staticmethod
    def set_embedding_choice(options: Dict[str, Any], choice: EmbeddingChoiceArg) -> None:
        options["embedding_choice"] = choice
