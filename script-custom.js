/* =========================
   AUDIO
========================= */
const correctSound = new Audio("c.mp3");
const wrongSound   = new Audio("r.mp3");

function playSafe(sound) {
  try {
    sound.currentTime = 0;
    sound.play();
  } catch (e) {
    console.warn("Lyd blokkert av browser");
  }
}

/* =========================
   APP
========================= */
var app = {
  version: 1,
  currentQ: 0,
  allData: {},
  questions: [],

  board: $("<div class='gameBoard'>"+
    "<div class='score' id='boardScore'>0</div>"+
    "<div class='score' id='team1'>0</div>"+
    "<div class='score' id='team2'>0</div>"+

    "<div class='questionHolder'>"+
      "<span class='question'></span>"+
    "</div>"+

    "<div class='colHolder'>"+
      "<div class='col1'></div>"+
      "<div class='col2'></div>"+
    "</div>"+

    "<div class='btnHolder'>"+
      "<div id='awardTeam1' data-team='1' class='button'>Lag 1</div>"+
      "<div id='newQuestion' class='button'>Neste spørsmål</div>"+
      "<div id='awardTeam2' data-team='2' class='button'>Lag 2</div>"+
    "</div>"+
  "</div>"),

  shuffle: function(array) {
    let i = array.length;
    while (i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  },

  /* =========================
     FLIP FUNKSJON
  ========================== */
  flipCard: function(holder) {
    const card = $(".card", holder);
    const flipped = card.data("flipped") === true;

    TweenLite.to(card, 0.8, {
      rotationX: flipped ? 0 : -180,
      onStart: function () {
        if (!flipped) playSafe(correctSound);
      }
    });

    card.data("flipped", !flipped);
    app.getBoardScore();
  },

  makeQuestion: function(qNum) {
    const qText = app.questions[qNum];
    const qAnswr = app.allData[qText];

    let qNumCards = Math.max(8, qAnswr.length);
    if (qNumCards % 2 !== 0) qNumCards++;

    const boardScore = app.board.find("#boardScore");
    const question = app.board.find(".question");
    const col1 = app.board.find(".col1");
    const col2 = app.board.find(".col2");

    boardScore.html(0);
    question.html(qText);
    col1.empty();
    col2.empty();

    for (let i = 0; i < qNumCards; i++) {
      let card;

      if (qAnswr[i]) {
        card = $(`
          <div class='cardHolder'>
            <div class='card'>
              <div class='front'><span class='DBG'>${i + 1}</span></div>
              <div class='back DBG'>
                <span>${qAnswr[i][0]}</span>
                <b class='LBG'>${qAnswr[i][1]}</b>
              </div>
            </div>
          </div>
        `);
      } else {
        card = $("<div class='cardHolder empty'><div></div></div>");
      }

      (i < qNumCards / 2 ? col1 : col2).append(card);
    }

    const cards = app.board.find(".card");

    TweenLite.set(cards, { transformStyle: "preserve-3d" });
    TweenLite.set(app.board.find(".back"), { rotationX: 180 });
    TweenLite.set(app.board.find(".card>div"), { backfaceVisibility: "hidden" });

    cards.data("flipped", false);

    app.board.find(".cardHolder").on("click", function () {
      app.flipCard(this);
    });
  },

  getBoardScore: function() {
    let score = 0;
    app.board.find(".card").each(function () {
      if ($(this).data("flipped")) {
        score += parseInt($(this).find("b").text());
      }
    });
    app.board.find("#boardScore").text(score);
  },

  awardPoints: function() {
    const team = $(this).data("team");
    const boardScore = parseInt(app.board.find("#boardScore").text());
    const teamEl = app.board.find("#team" + team);

    teamEl.text(parseInt(teamEl.text()) + boardScore);
    app.board.find("#boardScore").text(0);
  },

  changeQuestion: function() {
    app.currentQ++;
    if (app.currentQ >= app.questions.length) {
      localStorage.setItem("team1Score", app.board.find("#team1").text());
      localStorage.setItem("team2Score", app.board.find("#team2").text());
      window.location.href = "winner.html";
      return;
    }
    app.makeQuestion(app.currentQ);
  }
};

/* =========================
   FEIL X
========================= */
function showWrongX() {
  const x = $("<div id='wrongX'>✖</div>");
  $("body").append(x);
  x.css({
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    fontSize: "700px",
    color: "red",
    zIndex: 9999,
    opacity: 1
  });

  playSafe(wrongSound);

  setTimeout(() => {
    x.fadeOut(300, () => x.remove());
  }, 800);
}

/* =========================
   KEYBOARD
========================= */
$(document).on("keydown", function(e) {
  if (e.key.toLowerCase() === "f") { showWrongX(); return; }
  if (!/^[0-9]$/.test(e.key)) return;

  let index = e.key === "0" ? 9 : parseInt(e.key) - 1;
  const holders = $(".cardHolder").not(".empty");
  const holder = holders.eq(index);

  if (holder.length) app.flipCard(holder);
});

/* =========================
   PARSE CUSTOM INPUT
========================= */
function parseCustomInput(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l);
  const data = {};
  let currentQuestion = "";
  let answers = [];

  lines.forEach(line => {
    if (/^\d+\./.test(line)) {
      if (currentQuestion) data[currentQuestion] = answers;
      currentQuestion = line.replace(/^\d+\.\s*/, "");
      answers = [];
    } else {
      const parts = line.split(",").map(p => p.trim());
      if (parts.length === 2) answers.push([parts[0], parseInt(parts[1])]);
    }
  });

  if (currentQuestion) data[currentQuestion] = answers;
  return data;
}

/* =========================
   START CUSTOM GAME
========================= */
$(document).on("click", "#startCustom", function() {
  const text = $("#customInput").val();
  const parsedData = parseCustomInput(text);

  if (Object.keys(parsedData).length === 0) {
    alert("Ingen spørsmål funnet! Sjekk formatet.");
    return;
  }

  app.allData = parsedData;
  app.questions = Object.keys(parsedData);
  app.shuffle(app.questions);
  app.currentQ = 0;
  app.makeQuestion(app.currentQ);
  $("body").append(app.board);

  // Koble knappene
  $(document).on("click", "#newQuestion", app.changeQuestion);
  $(document).on("click", "#awardTeam1", app.awardPoints);
  $(document).on("click", "#awardTeam2", app.awardPoints);
});