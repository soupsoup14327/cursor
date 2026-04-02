/** Аватары: PNG с Pixabay (лицензия Pixabay, бесплатное использование). */
const AV = "./assets/avatars";

const heroes = [
  {
    id: "akari",
    name: "Акари",
    maxHp: 110,
    attack: 19,
    crit: 0.22,
    avatar: `${AV}/akari.png`,
  },
  {
    id: "ren",
    name: "Рэн",
    maxHp: 135,
    attack: 15,
    crit: 0.12,
    avatar: `${AV}/ren.png`,
  },
  {
    id: "yuna",
    name: "Юна",
    maxHp: 95,
    attack: 24,
    crit: 0.3,
    avatar: `${AV}/yuna.png`,
  },
];

const bossTemplate = {
  name: "Шадо Кай",
  maxHp: 150,
  attack: 17,
  crit: 0.2,
  avatar: `${AV}/boss.png`,
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
    animateAttackWindup(el.playerCard);
    animateDamage(el.enemyCard, { screenShake: false });
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
      animateAttackWindup(el.enemyCard);
      animateDamage(el.playerCard, { screenShake: true });
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

const DAMAGE_ANIM_MS = 360;

function animateAttackWindup(cardElement) {
  cardElement.classList.remove("attack-lunge");
  void cardElement.offsetWidth;
  cardElement.classList.add("attack-lunge");
  setTimeout(() => cardElement.classList.remove("attack-lunge"), 300);
}

function animateDamage(cardElement, { screenShake = false } = {}) {
  cardElement.classList.remove("hit");
  void cardElement.offsetWidth;
  cardElement.classList.add("hit");
  const hpWrap = cardElement.querySelector(".hp-wrap");
  if (hpWrap) {
    hpWrap.classList.remove("hp-flash");
    void hpWrap.offsetWidth;
    hpWrap.classList.add("hp-flash");
  }
  if (screenShake && el.battle) {
    el.battle.classList.remove("screen-shake");
    void el.battle.offsetWidth;
    el.battle.classList.add("screen-shake");
  }
  setTimeout(() => {
    cardElement.classList.remove("hit");
    if (hpWrap) {
      hpWrap.classList.remove("hp-flash");
    }
    if (el.battle) {
      el.battle.classList.remove("screen-shake");
    }
  }, DAMAGE_ANIM_MS);
}

function appendLog(message) {
  const item = document.createElement("li");
  item.textContent = message;
  el.battleLog.prepend(item);
}

function resetLog() {
  el.battleLog.innerHTML = "";
}
