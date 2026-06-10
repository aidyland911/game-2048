var http = require("http");
var fs = require("fs");
var path = require("path");
var { DatabaseSync } = require("node:sqlite");

var PORT = process.env.PORT || 80;
var DB_PATH = process.env.DB_PATH || "/data/scores.db";
var STATIC_DIR = path.join(__dirname, "public");
var MAX_NAME_LENGTH = 20;
var SCOREBOARD_SIZE = 20;

// Set up the database (the file lives on a Docker volume so it survives restarts)
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
var db = new DatabaseSync(DB_PATH);
db.exec(
  "CREATE TABLE IF NOT EXISTS players (" +
  "  name TEXT PRIMARY KEY," +
  "  best_score INTEGER NOT NULL DEFAULT 0" +
  ")"
);
var getPlayerScore = db.prepare("SELECT best_score FROM players WHERE name = ?");
var getTopScore = db.prepare("SELECT MAX(best_score) AS best FROM players");
var getTopScores = db.prepare(
  "SELECT name, best_score FROM players ORDER BY best_score DESC, name LIMIT " + SCOREBOARD_SIZE
);
var saveScore = db.prepare(
  "INSERT INTO players (name, best_score) VALUES (?, ?) " +
  "ON CONFLICT(name) DO UPDATE SET best_score = excluded.best_score " +
  "WHERE excluded.best_score > players.best_score"
);

var MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".eot": "application/vnd.ms-fontobject",
  ".ttf": "font/ttf",
  ".woff": "font/woff"
};

function sendJSON(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function cleanName(name) {
  return typeof name === "string" ? name.trim().slice(0, MAX_NAME_LENGTH) : "";
}

function handleScoreAPI(req, res, url) {
  if (req.method === "GET") {
    var name = cleanName(url.searchParams.get("name"));
    if (name) {
      var row = getPlayerScore.get(name);
      sendJSON(res, 200, { name: name, bestScore: row ? row.best_score : 0 });
    } else {
      sendJSON(res, 200, { bestScore: getTopScore.get().best || 0 });
    }
  } else if (req.method === "POST") {
    var body = "";
    req.on("data", function (chunk) { body += chunk; });
    req.on("end", function () {
      var payload;
      try {
        payload = JSON.parse(body);
      } catch (e) {
        return sendJSON(res, 400, { error: "invalid JSON" });
      }
      var postName = cleanName(payload.name);
      var score = payload.bestScore;
      if (!postName) {
        return sendJSON(res, 400, { error: "name is required" });
      }
      if (!Number.isInteger(score) || score < 0) {
        return sendJSON(res, 400, { error: "bestScore must be a non-negative integer" });
      }
      saveScore.run(postName, score); // only updates if the new score is higher
      var row = getPlayerScore.get(postName);
      sendJSON(res, 200, { name: postName, bestScore: row.best_score });
    });
  } else {
    sendJSON(res, 405, { error: "method not allowed" });
  }
}

function handleScoreboardAPI(req, res) {
  if (req.method !== "GET") {
    return sendJSON(res, 405, { error: "method not allowed" });
  }
  var scores = getTopScores.all().map(function (row) {
    return { name: row.name, bestScore: row.best_score };
  });
  sendJSON(res, 200, { scores: scores });
}

function serveStatic(req, res, url) {
  var urlPath = decodeURIComponent(url.pathname);
  if (urlPath === "/") urlPath = "/index.html";

  var filePath = path.join(STATIC_DIR, path.normalize(urlPath));
  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404);
      return res.end("Not found");
    }
    var type = MIME_TYPES[path.extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
}

http.createServer(function (req, res) {
  var url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/score") {
    handleScoreAPI(req, res, url);
  } else if (url.pathname === "/api/scores") {
    handleScoreboardAPI(req, res);
  } else {
    serveStatic(req, res, url);
  }
}).listen(PORT, function () {
  console.log("2048 listening on port " + PORT + ", scores stored in " + DB_PATH);
});
