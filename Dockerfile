FROM node:24-alpine

LABEL maintainer="aidy"

WORKDIR /app

COPY 2048 ./public
COPY server.js .

# SQLite database lives here; mount a volume to keep scores across containers
ENV DB_PATH=/data/scores.db
VOLUME /data

EXPOSE 80

CMD ["node", "server.js"]
