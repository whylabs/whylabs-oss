from functools import lru_cache


@lru_cache
def init_ci_logging():
    import logging
    import shutil
    import sys
    import warnings
    from typing import Any

    import pandas as pd
    from rich.console import Console
    from rich.logging import RichHandler
    from tqdm import tqdm

    # Use a reasonable terminal width when one can't be detected, like in CI. 200 is about the size of the
    # Gitlab CI window when it isn't full screened on a 1440p monitor.
    terminal_width = max(shutil.get_terminal_size().columns, 300)

    # Configure rich console
    console = Console(file=sys.stdout, width=terminal_width)

    # Configure the root logger
    logging.basicConfig(
        level="NOTSET",
        format="%(message)s",
        datefmt="[%X]",
        handlers=[RichHandler(console=console, rich_tracebacks=True, tracebacks_show_locals=True)],
    )

    # Monkey-patch warnings to go through logging
    def showwarning(message: Any, *args: Any, **kwargs: Any) -> None:
        logging.warning(message)

    warnings.showwarning = showwarning

    # Setup a logging filter to filter out "Pydantic V1 style" warnings
    class PydanticV1Filter(logging.Filter):
        def filter(self, record):
            # only if its a warning
            if record.levelno != logging.WARNING:
                return True
            return not record.getMessage().startswith("Pydantic V1 style")

    logging.getLogger().addFilter(PydanticV1Filter())

    tqdm.pandas()

    pd.set_option("display.max_columns", None)
    pd.set_option("display.max_colwidth", terminal_width // 3)
    pd.set_option("display.width", terminal_width)
    pd.set_option("display.colheader_justify", "center")  # Justify column headers
