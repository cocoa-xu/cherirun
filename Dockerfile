FROM node:21
LABEL maintainer="Cocoa Xu <i@uwucocoa.moe>"

WORKDIR /cherirun
ENV NODE_ENV=production NPM_CONFIG_LOGLEVEL=info

COPY . /cherirun
RUN cd /cherirun && \
    yarn install
EXPOSE 3000
CMD ["index.js"]
