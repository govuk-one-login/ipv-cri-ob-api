FROM amazonlinux:2023.12.20261117.0@sha256:9cf762f5099b606bcd851391317af7cd75b11363c4816ebcb5e91292dd5736a7

RUN dnf update -y && dnf install -y awscli

COPY . .

COPY test/acceptance-tests/run-traffic-tests.sh /run-traffic-tests.sh
RUN chmod +x /run-traffic-tests.sh

ENTRYPOINT ["/run-traffic-tests.sh"]
