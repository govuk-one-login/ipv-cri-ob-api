FROM amazonlinux:2023@sha256:9cf762f5099b606bcd851391317af7cd75b11363c4816ebcb5e91292dd5736a7

RUN dnf install -y nodejs24 awscli && dnf clean all

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY --chmod=+x test/acceptance-tests/run-tests.sh /run-tests.sh
COPY tsconfig.json ./
COPY test/acceptance-tests ./test/acceptance-tests

ENTRYPOINT ["/run-tests.sh"]
