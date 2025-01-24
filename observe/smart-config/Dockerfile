#
FROM python:3.10-slim

#
WORKDIR /code

#
COPY ./setup.py /code/setup.py
COPY ./smart_config /code/smart_config

#
RUN python /code/setup.py install
#
CMD ["uvicorn", "smart_config.server.server:app", "--host", "0.0.0.0", "--port", "8092", "--log-config", "smart_config/server/logging_config.conf"]