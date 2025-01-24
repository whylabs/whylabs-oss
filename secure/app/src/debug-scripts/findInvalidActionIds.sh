#!/bin/bash

ORG=$1

echo "checking for invalid global actions for '$ORG' if empty then all orgs"

ORG=${ORG:+$ORG/}
bucket=songbird-20201223060057342600000001

if [[ $ORG == "" ]]
then
  ORG=`aws s3 ls s3://${bucket}/monitor-config-v3/ | awk '{ if ($1 ~ /PRE/)  print ($NF) }'`
fi

#for k in `aws s3api list-objects --bucket $bucket --prefix monitor-config-v3/$ORG | jq -r '.Contents[].Key'`
for orgPath in $ORG
do
  for monitorPath in `aws s3 ls s3://${bucket}/monitor-config-v3/${orgPath} | awk '{ if ($1 ~ /PRE/)  print ($NF) }'`
  do
    latest=`aws s3 ls s3://${bucket}/monitor-config-v3/${orgPath}$monitorPath | awk '{ if ($1 ~ /PRE/)  print ($NF) }' | tail -1`

    for k in `aws s3api list-objects --bucket $bucket --prefix monitor-config-v3/${orgPath}${monitorPath}${latest} | jq -r '.Contents[].Key'`
    do
      if [[ $k =~ [Jj][Ss][Oo][Nn]$ ]]
      then
        monitor_config=`aws s3 cp s3://$bucket/$k -`
        orgId=`echo $monitor_config | jq -r '. | .orgId'`
        datasetId=`echo $monitor_config | jq -r '. | .datasetId'`

        for m in `echo $monitor_config | jq -c '.monitors[] | {id, actions}'`
        do
          monitorId=`echo $m | jq -r '.id'`

          for a in `echo $m | jq -c '.actions[]'`
          do
            type=`echo $a | jq -r '.type'`
            target=`echo $a | jq -r '.target'`

            # check if valid or not
            if [[ $type == "global" ]]
            then
              if [[ $target == "pagerDuty" || $target == "email" || $target == "slack" ]]
              then
                status="valid"
              else
                # check dynamodb
                queryvalues='{":actionId":{"S":"'
                queryvalues+="${target}"
                queryvalues+='"},":orgId":{"S":"'
                queryvalues+="${orgId}"
                queryvalues+='"}}'

                # example: aws dynamodb query --table-name songbird-GlobalActions-c4f818d --key-condition-expression 'id = :actionId AND org_id = :orgId' --expression-attribute-values  '{":actionId":{"S":"Users-Email"}, ":orgId" :{"S":"org-4471"}}'
                ddbResult=`aws dynamodb query --table-name songbird-GlobalActions-c4f818d --key-condition-expression 'id = :actionId AND org_id = :orgId' --expression-attribute-values $queryvalues`
                ddbCount=`echo $ddbResult | jq -r '.Count'`

                if [[ $ddbCount == 1 ]]
                then
                  info=`echo $ddbResult | jq -r '.Items[] | .payload.S'` 
                  status="valid - $info"
                else
                  status="invalid - $a"
                fi
              fi
            else
              status="invalid - not global"
            fi

            echo -e $status '\t' $orgId $datasetId $monitorId $type $target
          done
        done
      fi 
    done 
 done 
done
