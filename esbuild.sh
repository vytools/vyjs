#!/bin/bash
DIR="$(dirname "$(readlink -f "$0")")"
cd $DIR

docker buildx build -f esbuild/Dockerfile --load --tag vytools/esbuild:latest --platform linux/amd64 .

if [[ "$1" == "-n" ]]; then
    exit
fi

while true; do
    read -p "Do you wish to push the image? " yn
    case $yn in
        [Yy]* )
            docker buildx build -f esbuild/Dockerfile --push --tag vytools/esbuild:latest --platform linux/amd64 .
            break;;
        [Nn]* ) exit;;
        * ) echo "Please answer yes or no.";;
    esac
done
