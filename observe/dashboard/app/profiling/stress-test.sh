#! /bin/bash
local_npm_bin=$(npm bin)
local_pm2="$local_npm_bin/pm2"
local_flamebearer="$local_npm_bin/flamebearer"
echo Starting Dashbird profiler, please wait!
echo Killing old profiler instance...
"$local_pm2" delete dashboard-profiler 2>/dev/null
sleep 3 # wait for service to exit if it was still running
echo Building the service...
yarn build
echo Starting the service...
if [ "$(uname -s)" == "Linux" ]; then
  # Linux/WSL version of the startup script
  "$local_pm2" start yarn --name dashboard-profiler -- profile -p 8080
else
  # MacOS version, specifying the interpreter
  "$local_pm2" start yarn --name dashboard-profiler --interpreter $SHELL -- profile -p 8080
fi;
echo Giving the service some time to initialize, please wait...
sleep 10 # wait for service to start
echo Sending requests...
hey -m POST -D ./gql_query.json -T application/json -t 60 -c 10 -n 10 http://localhost:8080/graphql
echo Finished sending requests, processing the logs...
node --prof-process --preprocess -j ../v8.log | "$local_flamebearer"
x-www-browser flamegraph.html 2> /dev/null
"$local_pm2" ps
"$local_pm2" delete dashboard-profiler
echo Done profiling!
