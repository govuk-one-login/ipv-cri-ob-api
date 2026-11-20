FROM amazonlinux:2023@sha256:3ccfbe800f864982b0a4e124a614b2382518cbd04b3c1cd35202bd46f392675b

RUN dnf install -y nodejs24 awscli && dnf clean all

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY --chmod=+x test/acceptance-tests/run-tests.sh /run-tests.sh
COPY tsconfig.json ./
COPY test/acceptance-tests ./test/acceptance-tests

ENTRYPOINT ["/run-tests.sh"]
