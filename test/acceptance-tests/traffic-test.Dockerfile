FROM amazonlinux:2023.12.20261102.0@sha256:3ccfbe800f864982b0a4e124a614b2382518cbd04b3c1cd35202bd46f392675b

RUN dnf update -y && dnf install -y awscli

COPY . .

COPY test/acceptance-tests/run-traffic-tests.sh /run-traffic-tests.sh
RUN chmod +x /run-traffic-tests.sh

ENTRYPOINT ["/run-traffic-tests.sh"]
