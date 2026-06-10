window.fakeStorage = {
  _data: {},

  setItem: function (id, val) {
    return this._data[id] = String(val);
  },

  getItem: function (id) {
    return this._data.hasOwnProperty(id) ? this._data[id] : undefined;
  },

  removeItem: function (id) {
    return delete this._data[id];
  },

  clear: function () {
    return this._data = {};
  }
};

function LocalStorageManager() {
  this.bestScoreKey     = "bestScore";
  this.gameStateKey     = "gameState";

  var supported = this.localStorageSupported();
  this.storage = supported ? window.localStorage : window.fakeStorage;

  this.syncBestScoreFromServer();
}

LocalStorageManager.prototype.playerName = function () {
  return window.Player ? window.Player.getName() : "";
};

LocalStorageManager.prototype.showBestScore = function (score) {
  var bestContainer = document.querySelector(".best-container");
  if (bestContainer) bestContainer.textContent = score;
};

// Send a score to the server under the current player's name
// (the server only keeps it if it beats that player's record)
LocalStorageManager.prototype.pushBestScore = function (score) {
  var name = this.playerName();
  if (!name) return; // no player name yet: stay local-only
  fetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name, bestScore: Number(score) })
  })
    .then(function () {
      if (window.Scoreboard) window.Scoreboard.refresh();
    })
    .catch(function () {}); // server unreachable: localStorage still works
};

// Two-way sync with the server: adopt the player's server score if it is
// higher, or upload ours if this browser knows a better one
LocalStorageManager.prototype.syncBestScoreFromServer = function () {
  var self = this;
  var name = this.playerName();
  if (!name) return;
  fetch("/api/score?name=" + encodeURIComponent(name))
    .then(function (response) { return response.json(); })
    .then(function (data) {
      var localBest = Number(self.getBestScore());
      if (data.bestScore > localBest) {
        self.storage.setItem(self.bestScoreKey, data.bestScore);
        self.showBestScore(data.bestScore);
      } else if (localBest > data.bestScore) {
        self.pushBestScore(localBest);
      }
    })
    .catch(function () {});
};

// Switching to a different player: take that player's server score as-is,
// even if it is lower than what the previous player reached here
LocalStorageManager.prototype.adoptPlayerBestScore = function () {
  var self = this;
  var name = this.playerName();
  if (!name) return;
  fetch("/api/score?name=" + encodeURIComponent(name))
    .then(function (response) { return response.json(); })
    .then(function (data) {
      self.storage.setItem(self.bestScoreKey, data.bestScore);
      self.showBestScore(data.bestScore);
    })
    .catch(function () {});
};

LocalStorageManager.prototype.localStorageSupported = function () {
  var testKey = "test";
  var storage = window.localStorage;

  try {
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
};

// Best score getters/setters
LocalStorageManager.prototype.getBestScore = function () {
  return this.storage.getItem(this.bestScoreKey) || 0;
};

LocalStorageManager.prototype.setBestScore = function (score) {
  this.storage.setItem(this.bestScoreKey, score);
  this.pushBestScore(score);
};

// Game state getters/setters and clearing
LocalStorageManager.prototype.getGameState = function () {
  var stateJSON = this.storage.getItem(this.gameStateKey);
  return stateJSON ? JSON.parse(stateJSON) : null;
};

LocalStorageManager.prototype.setGameState = function (gameState) {
  this.storage.setItem(this.gameStateKey, JSON.stringify(gameState));
};

LocalStorageManager.prototype.clearGameState = function () {
  this.storage.removeItem(this.gameStateKey);
};
