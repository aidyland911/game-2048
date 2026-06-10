# game-2048

simple is better

a docker version of 2048 with a persistent best score

Based on gabrielecirulli/2048 (https://github.com/gabrielecirulli/2048)

Based on node:24-alpine — a small Node server serves the game and stores the
best score in a SQLite database, so the score survives container restarts.

# how it works

- `server.js` serves the game files and a small API at `/api/score`
- the best score is saved in a SQLite database at `/data/scores.db`
- mount a Docker volume at `/data` to keep the score across containers

# run the docker container with your own build

    git clone https://github.com/aidyland911/game-2048.git
    docker build -t aidyland911/2048 .
    docker run -d -p 8080:80 -v 2048-scores:/data aidyland911/2048

# run the docker container by pulling the image directly

    docker run -d -p 8080:80 -v 2048-scores:/data aidyland911/2048

# Access the game

    http://127.0.0.1:8080
