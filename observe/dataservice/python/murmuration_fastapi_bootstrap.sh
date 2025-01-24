#!/bin/bash
if grep isMaster /mnt/var/lib/info/instance.json | grep true;
then
    echo "This is  master node, do nothing, exiting"
    exit 0
fi

# Pre-empt cloud init from upgrading+restarting the daemon after the bootstrap by upgrading it here
sudo yum update docker -y
sudo systemctl start docker;

sudo usermod -aG docker ${USER}

sg docker "$(aws ecr get-login --region us-west-2 --no-include-email)"

# Number of recommended workers is 2 x number_of_cores +1
echo launching sg docker "docker run -d --rm  -p 127.0.0.1:8099:8099 \"$1\" --workers $((2 * $(nproc) + 1))"
sg docker "docker run -d --rm  -p 127.0.0.1:8099:8099 \"$1\" --workers $((2 * $(nproc) + 1))"