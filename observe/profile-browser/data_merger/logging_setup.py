import logging

__setup_done = False


def setup():
    global __setup_done
    if __setup_done:
        return
    logging.basicConfig(level=logging.INFO)
    logging.getLogger("botocore").setLevel(logging.ERROR)  # noisy

    # make everything with whylogs in the name only ERROR level
    for logger_name in logging.Logger.manager.loggerDict.keys():
        if "whylogs" in logger_name:
            logging.getLogger(logger_name).setLevel(logging.ERROR)

    __setup_done = True
