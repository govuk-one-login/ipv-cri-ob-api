FROM amazonlinux:2023.11.20260505.0@sha256:c1872fb69ff9ed9581c999509dd0dcb4288235087f1df4999b866affdac0278d

RUN dnf update -y && dnf install -y awscli

COPY . .

COPY test/acceptance-tests/run-traffic-tests.sh /run-traffic-tests.sh
RUN chmod +x /run-traffic-tests.sh

ENTRYPOINT ["/run-traffic-tests.sh"]
