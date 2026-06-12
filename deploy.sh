#!/usr/bin/env bash
set -e

RED="\033[1;31m"
GREEN="\033[1;32m"
BLUE="\033[1;34m"
NOCOLOUR="\033[0m"

stack_name="$1"

if [ -z "$stack_name" ]; then
  echo -e "${RED}[ERROR]${NOCOLOUR} ❯ stack name required as first argument, e.g. ${GREEN}./deploy.sh my-openBanking-api${NOCOLOUR}"
  exit 1
fi

echo -e "${GREEN}[INFO]${NOCOLOUR} ❯ Deploying ipv-cri-ob-api"
echo -e "${GREEN}[INFO]${NOCOLOUR} ❯ stack=${stack_name} region=eu-west-2"

echo -e "${BLUE}[1/4]${NOCOLOUR}  ❯ Running cfn-lint"
cfn-lint deploy/template.yaml -f pretty
echo -e "${BLUE}[2/4]${NOCOLOUR}  ❯ Running sam validate"
sam validate -t deploy/template.yaml --lint
echo -e "${BLUE}[3/4]${NOCOLOUR}  ❯ Building"
sam build -t deploy/template.yaml --region eu-west-2
echo -e "${BLUE}[4/4]${NOCOLOUR}  ❯ Deploying to ${stack_name}"
sam deploy --stack-name "$stack_name" \
  --no-fail-on-empty-changeset \
  --no-confirm-changeset \
  --resolve-s3 \
  --region eu-west-2 \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
  --tags \
  cri:component=ipv-cri-ob-api \
  cri:stack-type=dev \
  cri:application=Lime \
  cri:deployment-source=manual \
  --parameter-overrides \
  Environment=dev \
  ParameterPrefix="ipv-cri-ob-api" \
  DeploymentType="not-pipeline"
