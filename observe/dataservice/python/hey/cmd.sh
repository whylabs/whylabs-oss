#!/bin/bash

# start the worker with
#  gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind localhost:8090
hey -z 1m -c 10 -m POST -D ./req.json  -T 'application/json' -H "Content-Type: application/json" "http://localhost:8090/arima/compute"


