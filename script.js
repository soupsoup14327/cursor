const heroes = [
  {
    id: "akari",
    name: "Акари",
    maxHp: 110,
    attack: 19,
    crit: 0.22,
    avatar: makeAvatar({
      hair: "#ef58bf",
      eyes: "#44e6ff",
      accent: "#ffe160",
      bg: "#1d1d3f",
    }),
  },
  {
    id: "ren",
    name: "Рэн",
    maxHp: 135,
    attack: 15,
    crit: 0.12,
    avatar: makeAvatar({
      hair: "#4b74ff",
      eyes: "#89efff",
      accent: "#9a75ff",
      bg: "#17173a",
    }),
  },
  {
    id: "yuna",
    name: "Юна",
    maxHp: 95,
    attack: 24,
    crit: 0.3,
    avatar: makeAvatar({
      hair: "#ff6f74",
      eyes: "#ffe58d",
      accent: "#6fefb3",
      bg: "#28162e",
    }),
  },
];

const bossTemplate = {
  name: "Шадо Кай",
  maxHp: 150,
  attack: 17,
  crit: 0.2,
  avatar: makeAvatar({
    hair: "#d5487a",
    eyes: "#ffb8ce",
    accent: "#6f59ff",
    bg: "#2d1127",
  }),
};

const state = {
  player: null,
  enemy: null,
  round: 1,
  combo: 0,
  wins: 0,
  busy: false,
  finished: false,
};

const el = {
  heroGrid: document.querySelector("#hero-grid"),
  heroPicker: document.querySelector("#hero-picker"),
  battle: document.querySelector("#battle"),
  playerName: document.querySelector("#player-name"),
  playerAvatar: document.querySelector("#player-avatar"),
  playerHpBar: document.querySelector("#player-hp-bar"),
  playerHpText: document.querySelector("#player-hp-text"),
  playerStatus: document.querySelector("#player-status"),
  enemyName: document.querySelector("#enemy-name"),
  enemyAvatar: document.querySelector("#enemy-avatar"),
  enemyHpBar: document.querySelector("#enemy-hp-bar"),
  enemyHpText: document.querySelector("#enemy-hp-text"),
  enemyStatus: document.querySelector("#enemy-status"),
  round: document.querySelector("#round"),
  combo: document.querySelector("#combo"),
  wins: document.querySelector("#wins"),
  battleLog: document.querySelector("#battle-log"),
  playerCard: document.querySelector("#player-card"),
  enemyCard: document.querySelector("#enemy-card"),
  restartBtn: document.querySelector("#restart-btn"),
  actionButtons: [...document.querySelectorAll(".action-btn[data-action]")],
};

renderHeroPicker();
wireActions();

function renderHeroPicker() {
  el.heroGrid.innerHTML = "";
  heroes.forEach((hero) => {
    const button = document.createElement("button");
    button.className = "hero-btn";
    button.innerHTML = `
      <img src="${hero.avatar}" alt="${hero.name}" />
      <div>
        <span class="hero-name">${hero.name}</span>
        <span class="hero-stats">HP ${hero.maxHp} | ATK ${hero.attack} | CRIT ${(hero.crit * 100).toFixed(0)}%</span>
      </div>
    `;
    button.addEventListener("click", () => startBattle(hero));
    el.heroGrid.appendChild(button);
  });
}

function startBattle(heroTemplate) {
  state.player = { ...heroTemplate, hp: heroTemplate.maxHp, guarding: false };
  state.enemy = { ...bossTemplate, hp: bossTemplate.maxHp, guarding: false };
  state.round = 1;
  state.combo = 0;
  state.finished = false;
  state.busy = false;
  el.heroPicker.classList.add("hidden");
  el.battle.classList.remove("hidden");
  el.restartBtn.classList.add("hidden");
  toggleActions(false);
  resetLog();
  appendLog(`Битва началась: ${state.player.name} против ${state.enemy.name}.`);
  syncUI();
}

function wireActions() {
  el.actionButtons.forEach((btn) => {
    btn.addEventListener("click", () => runTurn(btn.dataset.action));
  });
  el.restartBtn.addEventListener("click", () => {
    el.heroPicker.classList.remove("hidden");
    el.battle.classList.add("hidden");
  });
}

function runTurn(playerAction) {
  if (state.finished || state.busy) {
    return;
  }
  state.busy = true;
  toggleActions(true);

  state.player.guarding = playerAction === "guard";
  const playerResult = executeAction(state.player, state.enemy, playerAction);
  if (playerResult.hit) {
    animateHit(el.enemyCard);
  }
  appendLog(playerResult.log);
  if (playerResult.hit) {
    state.combo += 1;
  } else {
    state.combo = 0;
  }

  if (state.enemy.hp <= 0) {
    finishBattle(true);
    return;
  }

  setTimeout(() => {
    const enemyAction = chooseEnemyAction();
    state.enemy.guarding = enemyAction === "guard";
    const enemyResult = executeAction(state.enemy, state.player, enemyAction);
    if (enemyResult.hit) {
      animateHit(el.playerCard);
    }
    appendLog(enemyResult.log);
    if (!enemyResult.hit) {
      state.combo = 0;
    }

    if (state.player.hp <= 0) {
      finishBattle(false);
      return;
    }

    state.round += 1;
    state.busy = false;
    toggleActions(false);
    syncUI();
  }, 520);
}

function chooseEnemyAction() {
  const pool = ["attack", "attack", "skill", "guard"];
  if (state.enemy.hp < 50) {
    pool.push("skill");
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function executeAction(attacker, defender, action) {
  if (action === "guard") {
    return { hit: false, log: `${attacker.name} встает в блок и готовится к удару.` };
  }

  let baseDamage = attacker.attack;
  let label = "атакует";
  if (action === "skill") {
    baseDamage = Math.round(baseDamage * 1.8);
    label = "использует спецприем";
  }

  const crit = Math.random() < attacker.crit;
  if (crit) {
    baseDamage = Math.round(baseDamage * 1.5);
  }
  const defenderGuarding = defender.guarding;
  if (defenderGuarding) {
    baseDamage = Math.round(baseDamage * 0.5);
  }

  const randomSpread = Math.floor(Math.random() * 4);
  const damage = Math.max(1, baseDamage - 2 + randomSpread);
  defender.hp = Math.max(0, defender.hp - damage);
  defender.guarding = false;
  syncUI();

  const critText = crit ? " Критический удар!" : "";
  const guardText = defenderGuarding ? " Защита смягчила урон." : "";
  return {
    hit: true,
    log: `${attacker.name} ${label} и наносит ${damage} урона.${critText}${guardText}`,
  };
}

function finishBattle(playerWon) {
  state.finished = true;
  state.busy = false;
  toggleActions(true);
  el.restartBtn.classList.remove("hidden");

  if (playerWon) {
    state.wins += 1;
    appendLog(`Победа! ${state.player.name} выигрывает матч.`);
    el.playerStatus.textContent = "Победа!";
    el.enemyStatus.textContent = "Повержен";
  } else {
    appendLog("Поражение... Босс оказался сильнее.");
    el.playerStatus.textContent = "Повержен";
    el.enemyStatus.textContent = "Победа босса";
  }
  syncUI();
}

function toggleActions(disabled) {
  el.actionButtons.forEach((btn) => {
    btn.disabled = disabled;
  });
}

function syncUI() {
  if (!state.player || !state.enemy) {
    return;
  }

  el.playerName.textContent = state.player.name;
  el.playerAvatar.src = state.player.avatar;
  el.playerHpText.textContent = `HP: ${state.player.hp}/${state.player.maxHp}`;
  el.playerHpBar.style.width = `${(state.player.hp / state.player.maxHp) * 100}%`;

  el.enemyName.textContent = state.enemy.name;
  el.enemyAvatar.src = state.enemy.avatar;
  el.enemyHpText.textContent = `HP: ${state.enemy.hp}/${state.enemy.maxHp}`;
  el.enemyHpBar.style.width = `${(state.enemy.hp / state.enemy.maxHp) * 100}%`;

  el.round.textContent = String(state.round);
  el.combo.textContent = String(state.combo);
  el.wins.textContent = String(state.wins);
}

function animateHit(cardElement) {
  cardElement.classList.add("hit");
  setTimeout(() => cardElement.classList.remove("hit"), 190);
}

function appendLog(message) {
  const item = document.createElement("li");
  item.textContent = message;
  el.battleLog.prepend(item);
}

function resetLog() {
  el.battleLog.innerHTML = "";
}

function makeAvatar({ hair, eyes, accent, bg }) {
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='${bg}' />
          <stop offset='100%' stop-color='#0f0f1f' />
        </linearGradient>
      </defs>
      <rect width='200' height='200' rx='18' fill='url(#g)' />
      <circle cx='100' cy='114' r='55' fill='#f8d8c6' />
      <path d='M42 102 C48 52, 154 44, 158 104 C154 72, 126 60, 102 64 C78 68, 50 80, 42 102Z' fill='${hair}' />
      <circle cx='82' cy='113' r='6' fill='${eyes}' />
      <circle cx='118' cy='113' r='6' fill='${eyes}' />
      <path d='M84 138 C94 148, 108 148, 118 138' stroke='#8e4f56' stroke-width='4' fill='none' stroke-linecap='round'/>
      <path d='M66 67 L134 67 L124 50 L76 50 Z' fill='${accent}' opacity='0.85'/>
      <circle cx='154' cy='38' r='12' fill='${accent}' opacity='0.95'/>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
