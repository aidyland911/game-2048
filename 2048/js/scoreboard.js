// Player name handling and the scoreboard panel
(function () {
  var NAME_KEY = "playerName";
  var MAX_NAME_LENGTH = 20;
  var REFRESH_INTERVAL = 30000;

  window.Player = {
    getName: function () {
      try {
        return (window.localStorage.getItem(NAME_KEY) || "").trim();
      } catch (e) {
        return "";
      }
    },
    setName: function (name) {
      try {
        window.localStorage.setItem(NAME_KEY, name);
      } catch (e) {}
    }
  };

  function renderScores(scores) {
    var list = document.getElementById("scoreboard-list");
    var empty = document.getElementById("scoreboard-empty");
    if (!list) return;

    list.innerHTML = "";
    scores.forEach(function (entry, i) {
      var li = document.createElement("li");
      if (entry.name === Player.getName()) li.className = "me";

      var name = document.createElement("span");
      name.textContent = (i + 1) + ". " + entry.name;
      var score = document.createElement("span");
      score.textContent = entry.bestScore;

      li.appendChild(name);
      li.appendChild(score);
      list.appendChild(li);
    });
    empty.style.display = scores.length ? "none" : "block";
  }

  window.Scoreboard = {
    refresh: function () {
      fetch("/api/scores")
        .then(function (response) { return response.json(); })
        .then(function (data) { renderScores(data.scores); })
        .catch(function () {});
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    var input = document.getElementById("player-name");
    input.value = Player.getName();

    // Enter confirms the name and gives the keyboard back to the game
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") input.blur();
    });

    input.addEventListener("change", function () {
      var name = input.value.trim().slice(0, MAX_NAME_LENGTH);
      input.value = name;
      var previous = Player.getName();
      if (name === previous) return;
      Player.setName(name);

      var storageManager = window.game && window.game.storageManager;
      if (!name || !storageManager) return;
      if (previous) {
        // switching player: show that player's best, don't carry the old one over
        storageManager.adoptPlayerBestScore();
      } else {
        // first time naming: claim the best score already in this browser
        storageManager.syncBestScoreFromServer();
      }
      Scoreboard.refresh();
    });

    Scoreboard.refresh();
    setInterval(Scoreboard.refresh, REFRESH_INTERVAL);
  });
})();
