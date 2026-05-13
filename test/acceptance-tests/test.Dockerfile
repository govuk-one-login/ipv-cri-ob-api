FROM amazonlinux:2023@sha256:82085f72b15db462da227bd8a45c925c72f9d6f25965d22f1c31c47e0a803d80

RUN dnf install -y nodejs24 awscli && dnf clean all

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

COPY test/acceptance-tests/run-tests.sh /run-tests.sh
RUN chmod +x /run-tests.sh

ENTRYPOINT ["/run-tests.sh"]
