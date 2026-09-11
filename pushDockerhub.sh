#!/bin/bash
set -e

CONTAINER_NAME=grist-with-subpath
VERSION=1.7.19

sudo docker login -u admin@knf.vu.lt
sudo docker build -t $CONTAINER_NAME .
sudo docker tag $CONTAINER_NAME vuknf/$CONTAINER_NAME:latest
sudo docker tag $CONTAINER_NAME vuknf/$CONTAINER_NAME:$VERSION
sudo docker push vuknf/$CONTAINER_NAME:latest
sudo docker push vuknf/$CONTAINER_NAME:$VERSION
