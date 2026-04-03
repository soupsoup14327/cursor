const EFFECT_TYPES = {
  fire: { label: "Огонь", dot: 5 },
  poison: { label: "Яд", dot: 4 },
  bleed: { label: "Кровотечение", dot: 3 },
  cold: { label: "Мороз", dot: 0, reduceNextDamage: 0.82 },
};

const SCENARIO_POPUPS = [
  "Под ногами скользкий камень — вы удерживаете равновесие.",
  "На миг чувствуете прилив сил.",
  "Замечаете слабое звено в защите противника.",
  "Старая рана нычёт, но не сковывает шаг.",
  "Вспышка интуиции: следующий удар будет удачнее.",
  "Пыль в глаза — моргаете, но удар всё равно летит.",
  "Вы слышите шёпот мастера за столом и улыбаетесь.",
  "Пальцы онемели от холода, но хватка крепка.",
  "Случайное блеснувшее солнце ослепляет врага на доль секунды.",
  "Камень под ногой сдвигается — вы успеваете вперёд.",
];

const heroes = [
  {
    id: "solaris",
    name: "Соларис Нёбесный",
    sigil: "S",
    sigilColor: "#c9a227",
    maxHp: 168,
    attack: 17,
    crit: 0.2,
    maxMana: 100,
    manaRegen: 14,
    skills: [
      { id: "sol_1", name: "Священное пламя", cost: 18, kind: "damage", mult: 1.45, applyStatus: { type: "fire", turns: 2 } },
      { id: "sol_2", name: "Направляющий луч", cost: 32, kind: "damage", mult: 2.0 },
      { id: "sol_3", name: "Благословение удара", cost: 22, kind: "buff_next", nextMult: 1.5 },
      { id: "sol_4", name: "Лечение ран", cost: 25, kind: "heal", heal: 32 },
      { id: "sol_5", name: "Пламя небес", cost: 48, kind: "damage", mult: 2.55, cooldown: 2, applyStatus: { type: "fire", turns: 3 } },
    ],
  },
  {
    id: "torgun",
    name: "Торгун Каменный",
    sigil: "T",
    sigilColor: "#5c7a9e",
    maxHp: 205,
    attack: 14,
    crit: 0.11,
    maxMana: 90,
    manaRegen: 12,
    skills: [
      { id: "tor_1", name: "Таран", cost: 12, kind: "damage", mult: 1.35 },
      { id: "tor_2", name: "Стойка щитоносца", cost: 18, kind: "guard_heal", heal: 22 },
      { id: "tor_3", name: "Удар щитом", cost: 28, kind: "damage_heal", mult: 1.55, heal: 12 },
      { id: "tor_4", name: "Сбить почву", cost: 20, kind: "debuff_enemy", weakMult: 0.62 },
      { id: "tor_5", name: "Сокрушитель", cost: 42, kind: "damage", mult: 2.15, cooldown: 1, applyStatus: { type: "bleed", turns: 2 } },
    ],
  },
  {
    id: "keris",
    name: "Кэрис Ночная",
    sigil: "K",
    sigilColor: "#8b3a5c",
    maxHp: 145,
    attack: 21,
    crit: 0.28,
    maxMana: 110,
    manaRegen: 13,
    skills: [
      { id: "ker_1", name: "Быстрый выпад", cost: 15, kind: "damage", mult: 1.45, applyStatus: { type: "poison", turns: 2 } },
      { id: "ker_2", name: "Метка охотника", cost: 26, kind: "mark_crit" },
      { id: "ker_3", name: "Удар вампира", cost: 30, kind: "lifesteal", mult: 1.75, steal: 0.38 },
      { id: "ker_4", name: "Ярость охотника", cost: 18, kind: "rage", rageTurns: 2 },
      { id: "ker_5", name: "Казнь тени", cost: 55, kind: "damage", mult: 2.55, cooldown: 2, applyStatus: { type: "bleed", turns: 3 } },
    ],
  },
];

const bosses = [
  {
    id: "xarth",
    name: "Тень из Ксарта",
    sigil: "X",
    sigilColor: "#4a4a6a",
    maxHp: 218,
    attack: 15,
    crit: 0.18,
    maxMana: 95,
    manaRegen: 12,
    skills: [
      { id: "bx1", name: "Хватка сумерек", cost: 14, mult: 1.45, applyStatus: { type: "cold", turns: 1 } },
      { id: "bx2", name: "Волна тьмы", cost: 28, mult: 1.85 },
      { id: "bx3", name: "Пожирание жизни", cost: 22, mult: 1.3, heal: 16 },
      { id: "bx4", name: "Кошмарный вид", cost: 38, mult: 2.1, cooldown: 1, applyStatus: { type: "poison", turns: 2 } },
    ],
  },
  {
    id: "mordvin",
    name: "Мордвин Ледяной",
    sigil: "M",
    sigilColor: "#5a8aaa",
    maxHp: 200,
    attack: 16,
    crit: 0.16,
    maxMana: 100,
    manaRegen: 13,
    skills: [
      { id: "bm1", name: "Ледяной шип", cost: 13, mult: 1.4, applyStatus: { type: "cold", turns: 1 } },
      { id: "bm2", name: "Морозная волна", cost: 26, mult: 1.8 },
      { id: "bm3", name: "Град стрел", cost: 32, mult: 1.95 },
      { id: "bm4", name: "Ледяная могила", cost: 44, mult: 2.35, cooldown: 2, applyStatus: { type: "cold", turns: 2 } },
    ],
  },
  {
    id: "kurn",
    name: "Курн Железнорожный",
    sigil: "G",
    sigilColor: "#7a7a82",
    maxHp: 238,
    attack: 13,
    crit: 0.12,
    maxMana: 85,
    manaRegen: 11,
    skills: [
      { id: "bk1", name: "Каменный кулак", cost: 12, mult: 1.35 },
      { id: "bk2", name: "Обвал", cost: 24, mult: 1.7 },
      { id: "bk3", name: "Слить камень", cost: 20, mult: 1.2, heal: 22 },
      { id: "bk4", name: "Перегрев ядра", cost: 40, mult: 2.15, cooldown: 1, applyStatus: { type: "fire", turns: 2 } },
    ],
  },
  {
    id: "loren",
    name: "Лорен Изумрудная",
    sigil: "V",
    sigilColor: "#8b1538",
    maxHp: 188,
    attack: 18,
    crit: 0.24,
    maxMana: 105,
    manaRegen: 14,
    skills: [
      { id: "bl1", name: "Бич крови", cost: 15, mult: 1.45, applyStatus: { type: "bleed", turns: 2 } },
      { id: "bl2", name: "Пир клинков", cost: 29, mult: 1.9 },
      { id: "bl3", name: "Укус", cost: 24, mult: 1.65, heal: 18, applyStatus: { type: "poison", turns: 1 } },
      { id: "bl4", name: "Кровавый обет", cost: 46, mult: 2.35, cooldown: 2, applyStatus: { type: "bleed", turns: 3 } },
    ],
  },
  {
    id: "vorn",
    name: "Архимаг Ворн",
    sigil: "A",
    sigilColor: "#6b4c9c",
    maxHp: 208,
    attack: 16,
    crit: 0.2,
    maxMana: 110,
    manaRegen: 15,
    skills: [
      { id: "bz1", name: "Снаряд силы", cost: 14, mult: 1.45, applyStatus: { type: "fire", turns: 1 } },
      { id: "bz2", name: "Проклятие", cost: 27, mult: 1.85, applyStatus: { type: "poison", turns: 2 } },
      { id: "bz3", name: "Жертва силы", cost: 18, mult: 1.25, heal: 20 },
      { id: "bz4", name: "Метеор Ворна", cost: 48, mult: 2.35, cooldown: 2, applyStatus: { type: "fire", turns: 2 } },
    ],
  },
];

const ENCOUNTER_FLAVOR = [
  "Туман расступается: впереди слышен металлический лязг.",
  "Карта модуля говорит: здесь должна быть засада.",
  "Запах серы и старого пергамента — сцена началась.",
  "Кости на столе мастера ещё не остыли, а бой уже идёт.",
  "Свечи в подземелье мерцают: инициатива у кого первого?",
];

const state = {
  player: null,
  enemy: null,
  round: 1,
  combo: 0,
  wins: 0,
  busy: false,
  finished: false,
  playerTurnDice: { d20: 0, d8: 0 },
  enemyTurnDice: { d20: 0, d8: 0 },
};

const el = {
  heroGrid: document.querySelector("#hero-grid"),
  heroPicker: document.querySelector("#hero-picker"),
  battle: document.querySelector("#battle"),
  playerName: document.querySelector("#player-name"),
  playerAvatar: document.querySelector("#player-avatar"),
  playerHpBar: document.querySelector("#player-hp-bar"),
  playerHpText: document.querySelector("#player-hp-text"),
  playerManaBar: document.querySelector("#player-mana-bar"),
  playerManaText: document.querySelector("#player-mana-text"),
  playerStatus: document.querySelector("#player-status"),
  playerEffects: document.querySelector("#player-effects"),
  enemyName: document.querySelector("#enemy-name"),
  enemyAvatar: document.querySelector("#enemy-avatar"),
  enemyHpBar: document.querySelector("#enemy-hp-bar"),
  enemyHpText: document.querySelector("#enemy-hp-text"),
  enemyManaBar: document.querySelector("#enemy-mana-bar"),
  enemyManaText: document.querySelector("#enemy-mana-text"),
  enemyStatus: document.querySelector("#enemy-status"),
  enemyEffects: document.querySelector("#enemy-effects"),
  round: document.querySelector("#round"),
  combo: document.querySelector("#combo"),
  wins: document.querySelector("#wins"),
  battleLog: document.querySelector("#battle-log"),
  playerCard: document.querySelector("#player-card"),
  enemyCard: document.querySelector("#enemy-card"),
  restartBtn: document.querySelector("#restart-btn"),
  skillBar: document.querySelector("#skill-bar"),
  baseActions: [...document.querySelectorAll(".action-btn[data-action]")],
  dicePD20: document.querySelector("#dice-p-d20"),
  dicePD8: document.querySelector("#dice-p-d8"),
  dicePBonus: document.querySelector("#dice-p-bonus"),
  diceED20: document.querySelector("#dice-e-d20"),
  diceED8: document.querySelector("#dice-e-d8"),
  diceEBonus: document.querySelector("#dice-e-bonus"),
  toastRoot: document.querySelector("#toast-root"),
};

renderHeroPicker();
wireActions();

function rollD20() {
  return 1 + Math.floor(Math.random() * 20);
}

function rollD8() {
  return 1 + Math.floor(Math.random() * 8);
}

function diceBonus(d20, d8) {
  return Math.max(0, Math.floor((d20 + d8) / 4) - 2);
}

function pickRandomBoss() {
  return bosses[Math.floor(Math.random() * bosses.length)];
}

function randomFlavor() {
  return ENCOUNTER_FLAVOR[Math.floor(Math.random() * ENCOUNTER_FLAVOR.length)];
}

function showToast(text) {
  if (!el.toastRoot) {
    return;
  }
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = text;
  el.toastRoot.appendChild(t);
  requestAnimationFrame(() => t.classList.add("toast--show"));
  setTimeout(() => {
    t.classList.remove("toast--show");
    setTimeout(() => t.remove(), 300);
  }, 2600);
}

function maybeRandomScenarioPopup() {
  if (Math.random() < 0.42) {
    showToast(SCENARIO_POPUPS[Math.floor(Math.random() * SCENARIO_POPUPS.length)]);
  }
}

function applySigil(domEl, fighter) {
  if (!domEl || !fighter) {
    return;
  }
  domEl.textContent = fighter.sigil;
  domEl.style.setProperty("--sigil-bg", fighter.sigilColor);
}

function cloneFighter(template, isPlayer) {
  const f = {
    ...template,
    hp: template.maxHp,
    mana: Math.min(template.maxMana, Math.floor(template.maxMana * 0.55)),
    guarding: false,
    skillCd: {},
    nextDamageMult: 1,
    guaranteedCrit: false,
    rageTurns: 0,
    attackWeakNext: false,
    statusEffects: [],
    nextDamageTakenMod: 1,
  };
  if (isPlayer) {
    f.skillList = template.skills;
  } else {
    f.skillList = template.skills.map((s) => ({ ...s }));
  }
  return f;
}

function addStatus(fighter, type, turns) {
  const ex = fighter.statusEffects.find((e) => e.type === type);
  if (ex) {
    ex.turns += turns;
  } else {
    fighter.statusEffects.push({ type, turns });
  }
}

function effectStripHtml(fighter) {
  if (!fighter.statusEffects?.length) {
    return "";
  }
  return fighter.statusEffects
    .map((e) => {
      const def = EFFECT_TYPES[e.type];
      if (!def) {
        return "";
      }
      return `<span class="fx-tag fx-tag--${e.type}">${def.label} ${e.turns}</span>`;
    })
    .join("");
}

function tickEndOfRoundDots() {
  [state.player, state.enemy].forEach((fighter) => {
    if (!fighter.statusEffects?.length) {
      return;
    }
    const name = fighter.name;
    fighter.statusEffects = fighter.statusEffects.filter((e) => {
      const def = EFFECT_TYPES[e.type];
      if (!def) {
        return false;
      }
      if (def.dot > 0) {
        const dmg = def.dot;
        fighter.hp = Math.max(0, fighter.hp - dmg);
        appendLog(`${name} страдает от «${def.label}»: −${dmg} HP.`);
        e.turns -= 1;
        return e.turns > 0;
      }
      if (e.type === "cold") {
        e.turns -= 1;
        return e.turns > 0;
      }
      return e.turns > 0;
    });
  });
}

function applyColdDamageMod(defender, baseDamage) {
  const idx = defender.statusEffects?.findIndex((x) => x.type === "cold");
  if (idx === -1) {
    return baseDamage;
  }
  const def = EFFECT_TYPES.cold;
  defender.statusEffects.splice(idx, 1);
  return Math.round(baseDamage * (def.reduceNextDamage || 1));
}

function renderHeroPicker() {
  el.heroGrid.innerHTML = "";
  heroes.forEach((hero) => {
    const button = document.createElement("button");
    button.className = "hero-btn";
    button.innerHTML = `
      <div class="hero-sigil" style="--sigil-bg:${hero.sigilColor}">${hero.sigil}</div>
      <div>
        <span class="hero-name">${hero.name}</span>
        <span class="hero-stats">HP ${hero.maxHp} · Мана ${hero.maxMana} · Сила ${hero.attack} · Крит ${(hero.crit * 100).toFixed(0)}%</span>
      </div>
    `;
    button.addEventListener("click", () => startBattle(hero));
    el.heroGrid.appendChild(button);
  });
}

function renderSkillBar() {
  el.skillBar.innerHTML = "";
  if (!state.player?.skillList) {
    return;
  }
  state.player.skillList.forEach((skill) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "skill-btn";
    btn.dataset.skillId = skill.id;
    btn.innerHTML = `<span class="skill-btn__name">${skill.name}</span><span class="skill-btn__cost">${skill.cost} маны</span>`;
    btn.title = skillTip(skill);
    btn.addEventListener("click", () => runTurn("skill", skill.id));
    el.skillBar.appendChild(btn);
  });
}

function skillTip(s) {
  if (s.kind === "damage") {
    let t = `${s.name}: урон ×${s.mult}${s.cooldown ? `, перезарядка ${s.cooldown} раунда` : ""}`;
    if (s.applyStatus) {
      t += ` · ${EFFECT_TYPES[s.applyStatus.type]?.label || ""}`;
    }
    return t;
  }
  if (s.kind === "heal") {
    return `${s.name}: +${s.heal} HP`;
  }
  if (s.kind === "buff_next") {
    return `${s.name}: следующий урон +${Math.round((s.nextMult - 1) * 100)}%`;
  }
  if (s.kind === "guard_heal") {
    return `${s.name}: укрытие и +${s.heal} HP`;
  }
  if (s.kind === "damage_heal") {
    return `${s.name}: урон ×${s.mult}, лечение +${s.heal}`;
  }
  if (s.kind === "debuff_enemy") {
    return `${s.name}: следующий удар врага слабее`;
  }
  if (s.kind === "mark_crit") {
    return `${s.name}: следующий удар — критический`;
  }
  if (s.kind === "lifesteal") {
    return `${s.name}: урон ×${s.mult}, поглощение ${Math.round(s.steal * 100)}%`;
  }
  if (s.kind === "rage") {
    return `${s.name}: +20% к силе на ${s.rageTurns} удара`;
  }
  return s.name;
}

function updateDiceUI(whichSide) {
  if (whichSide === "player" || whichSide === "both") {
    const d = state.playerTurnDice;
    const b = diceBonus(d.d20, d.d8);
    if (el.dicePD20) {
      el.dicePD20.textContent = String(d.d20);
    }
    if (el.dicePD8) {
      el.dicePD8.textContent = String(d.d8);
    }
    if (el.dicePBonus) {
      el.dicePBonus.textContent = `бонус к урону: +${b}`;
    }
  }
  if (whichSide === "enemy" || whichSide === "both") {
    const d = state.enemyTurnDice;
    const has = d.d20 > 0;
    const b = has ? diceBonus(d.d20, d.d8) : 0;
    if (el.diceED20) {
      el.diceED20.textContent = has ? String(d.d20) : "—";
    }
    if (el.diceED8) {
      el.diceED8.textContent = has ? String(d.d8) : "—";
    }
    if (el.diceEBonus) {
      el.diceEBonus.textContent = has ? `бонус: +${b}` : "бонус: —";
    }
  }
}

function startBattle(heroTemplate) {
  const bossTemplate = pickRandomBoss();
  state.player = cloneFighter(heroTemplate, true);
  state.enemy = cloneFighter(bossTemplate, false);
  state.round = 1;
  state.combo = 0;
  state.finished = false;
  state.busy = false;
  state.playerTurnDice = { d20: rollD20(), d8: rollD8() };
  state.enemyTurnDice = { d20: 0, d8: 0 };
  el.heroPicker.classList.add("hidden");
  el.battle.classList.remove("hidden");
  el.restartBtn.classList.add("hidden");
  renderSkillBar();
  toggleActions(false);
  resetLog();
  appendLog(randomFlavor());
  appendLog(`Столкновение: ${state.player.name} против ${state.enemy.name}.`);
  appendLog(`Ваш бросок: d20=${state.playerTurnDice.d20}, d8=${state.playerTurnDice.d8} (бонус к урону +${diceBonus(state.playerTurnDice.d20, state.playerTurnDice.d8)}).`);
  updateDiceUI("both");
  syncUI();
}

function wireActions() {
  el.baseActions.forEach((btn) => {
    btn.addEventListener("click", () => runTurn(btn.dataset.action));
  });
  el.restartBtn.addEventListener("click", () => {
    el.heroPicker.classList.remove("hidden");
    el.battle.classList.add("hidden");
    el.skillBar.innerHTML = "";
    if (el.toastRoot) {
      el.toastRoot.innerHTML = "";
    }
  });
}

function runTurn(playerAction, skillId = null) {
  if (state.finished || state.busy) {
    return;
  }
  if (playerAction === "skill" && !skillId) {
    return;
  }

  state.playerTurnDice = { d20: rollD20(), d8: rollD8() };
  appendLog(`Ваш бросок: d20=${state.playerTurnDice.d20}, d8=${state.playerTurnDice.d8} (бонус +${diceBonus(state.playerTurnDice.d20, state.playerTurnDice.d8)}).`);
  updateDiceUI("player");
  maybeRandomScenarioPopup();

  state.busy = true;
  toggleActions(true);

  state.player.guarding = playerAction === "guard";
  let playerResult;

  if (playerAction === "attack") {
    playerResult = executeAttack(state.player, state.enemy, { mult: 1, label: "бьёт", attackerSide: "player" });
  } else if (playerAction === "guard") {
    playerResult = executeGuard(state.player);
  } else if (playerAction === "skill") {
    playerResult = executeHeroSkill(state.player, state.enemy, skillId);
  } else {
    playerResult = { hit: false, log: "…" };
  }

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
    state.enemyTurnDice = { d20: rollD20(), d8: rollD8() };
    appendLog(`Бросок врага: d20=${state.enemyTurnDice.d20}, d8=${state.enemyTurnDice.d8} (бонус +${diceBonus(state.enemyTurnDice.d20, state.enemyTurnDice.d8)}).`);
    updateDiceUI("enemy");
    if (Math.random() < 0.28) {
      showToast(SCENARIO_POPUPS[Math.floor(Math.random() * SCENARIO_POPUPS.length)]);
    }

    const enemyMove = chooseEnemyAction();
    state.enemy.guarding = enemyMove.type === "guard";
    let enemyResult;
    if (enemyMove.type === "attack") {
      enemyResult = executeAttack(state.enemy, state.player, { mult: 1, label: "бьёт", attackerSide: "enemy" });
    } else if (enemyMove.type === "guard") {
      enemyResult = executeGuard(state.enemy);
    } else {
      enemyResult = executeBossSkill(state.enemy, state.player, enemyMove.skillId);
    }

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

    tickEndOfRoundDots();
    if (state.player.hp <= 0) {
      finishBattle(false);
      return;
    }
    if (state.enemy.hp <= 0) {
      finishBattle(true);
      return;
    }

    regenMana(state.player);
    regenMana(state.enemy);
    tickCooldowns(state.player);
    tickCooldowns(state.enemy);

    state.round += 1;
    state.busy = false;
    toggleActions(false);
    syncUI();
  }, 520);
}

function regenMana(fighter) {
  fighter.mana = Math.min(fighter.maxMana, fighter.mana + fighter.manaRegen);
}

function tickCooldowns(fighter) {
  Object.keys(fighter.skillCd).forEach((id) => {
    if (fighter.skillCd[id] > 0) {
      fighter.skillCd[id] -= 1;
    }
  });
}

function getEffectiveAttack(attacker) {
  let atk = attacker.attack;
  if (attacker.rageTurns > 0) {
    atk *= 1.2;
  }
  return atk;
}

function onPlayerDealtDamage() {
  if (state.player.rageTurns > 0) {
    state.player.rageTurns -= 1;
  }
}

function executeAttack(attacker, defender, opts) {
  const { mult, label, attackerSide, applyStatus } = opts;
  const dice = attackerSide === "player" ? state.playerTurnDice : state.enemyTurnDice;
  const bonus = diceBonus(dice.d20, dice.d8);

  let baseDamage = Math.round(getEffectiveAttack(attacker) * mult) + bonus;

  if (attacker === state.player && attacker.nextDamageMult !== 1) {
    baseDamage = Math.round(baseDamage * attacker.nextDamageMult);
    attacker.nextDamageMult = 1;
  }

  baseDamage = applyColdDamageMod(defender, baseDamage);

  let crit = Math.random() < attacker.crit;
  if (attacker === state.player && attacker.guaranteedCrit) {
    crit = true;
    attacker.guaranteedCrit = false;
  }
  if (crit) {
    baseDamage = Math.round(baseDamage * 1.5);
  }

  let defenderGuarding = defender.guarding;
  if (defenderGuarding) {
    baseDamage = Math.round(baseDamage * 0.5);
  }

  if (attacker === state.enemy && attacker.attackWeakNext) {
    baseDamage = Math.round(baseDamage * 0.62);
    attacker.attackWeakNext = false;
  }

  const randomSpread = Math.floor(Math.random() * 4);
  const damage = Math.max(1, baseDamage - 2 + randomSpread);
  defender.hp = Math.max(0, defender.hp - damage);
  defender.guarding = false;

  if (applyStatus && defender.hp > 0) {
    addStatus(defender, applyStatus.type, applyStatus.turns);
  }

  if (attacker === state.player) {
    onPlayerDealtDamage();
  }

  syncUI();

  let critText = "";
  if (crit) {
    critText = ` Крит! (как d20 на столе).`;
  }
  const guardText = defenderGuarding ? " Укрытие снижает урон." : "";
  const diceText = ` [d20+d8→+${bonus}]`;
  return {
    hit: true,
    log: `${attacker.name} ${label} и наносит ${damage} урона.${diceText}${critText}${guardText}`,
  };
}

function executeGuard(attacker) {
  attacker.guarding = true;
  syncUI();
  return { hit: false, log: `${attacker.name} занимает оборону и готовится к удару.` };
}

function findSkill(fighter, skillId) {
  return fighter.skillList.find((s) => s.id === skillId);
}

function executeHeroSkill(player, enemy, skillId) {
  const skill = findSkill(player, skillId);
  if (!skill) {
    return { hit: false, log: "Неизвестный приём." };
  }
  if (player.mana < skill.cost) {
    return { hit: false, log: "Недостаточно маны." };
  }
  if ((player.skillCd[skill.id] || 0) > 0) {
    return { hit: false, log: `«${skill.name}» на перезарядке (${player.skillCd[skill.id]} раунд.).` };
  }

  player.mana -= skill.cost;

  switch (skill.kind) {
    case "damage": {
      if (skill.cooldown) {
        player.skillCd[skill.id] = skill.cooldown;
      }
      return executeAttack(player, enemy, {
        mult: skill.mult,
        label: `творит «${skill.name}»`,
        attackerSide: "player",
        applyStatus: skill.applyStatus,
      });
    }
    case "heal": {
      const healed = Math.min(skill.heal, player.maxHp - player.hp);
      player.hp += healed;
      syncUI();
      return { hit: false, log: `${player.name} творит «${skill.name}» и восстанавливает ${healed} HP.` };
    }
    case "buff_next": {
      player.nextDamageMult = skill.nextMult;
      syncUI();
      return { hit: false, log: `${player.name}: «${skill.name}» — следующий удар будет сильнее.` };
    }
    case "guard_heal": {
      player.guarding = true;
      const healed = Math.min(skill.heal, player.maxHp - player.hp);
      player.hp += healed;
      syncUI();
      return { hit: false, log: `${player.name} «${skill.name}»: укрытие и +${healed} HP.` };
    }
    case "damage_heal": {
      const r = executeAttack(player, enemy, {
        mult: skill.mult,
        label: `творит «${skill.name}»`,
        attackerSide: "player",
        applyStatus: skill.applyStatus,
      });
      const healed = Math.min(skill.heal, player.maxHp - player.hp);
      player.hp += healed;
      syncUI();
      return {
        hit: r.hit,
        log: r.log.replace(/\.$/, "") + ` Второе дыхание: +${healed} HP.`,
      };
    }
    case "debuff_enemy": {
      enemy.attackWeakNext = true;
      syncUI();
      return { hit: false, log: `${player.name} «${skill.name}»: противник теряет опору — его следующий удар слабее.` };
    }
    case "mark_crit": {
      player.guaranteedCrit = true;
      syncUI();
      return { hit: false, log: `${player.name} ставит «${skill.name}» — следующий удар по уязвимому месту.` };
    }
    case "lifesteal": {
      const before = enemy.hp;
      const r = executeAttack(player, enemy, {
        mult: skill.mult,
        label: `творит «${skill.name}»`,
        attackerSide: "player",
        applyStatus: skill.applyStatus,
      });
      const dealt = before - enemy.hp;
      const healed = Math.min(Math.floor(dealt * skill.steal), player.maxHp - player.hp);
      player.hp += healed;
      syncUI();
      return {
        hit: r.hit,
        log: r.log.replace(/\.$/, "") + ` Высасывание жизни: +${healed} HP.`,
      };
    }
    case "rage": {
      player.rageTurns = skill.rageTurns;
      syncUI();
      return {
        hit: false,
        log: `${player.name} впадает в «${skill.name}» (+20% к силе на ${skill.rageTurns} удара).`,
      };
    }
    default:
      syncUI();
      return { hit: false, log: "Приём не сработал." };
  }
}

function executeBossSkill(enemy, player, skillId) {
  const skill = findSkill(enemy, skillId);
  if (!skill) {
    return executeAttack(enemy, player, { mult: 1, label: "бьёт", attackerSide: "enemy" });
  }
  if (enemy.mana < skill.cost) {
    return executeAttack(enemy, player, { mult: 1, label: "бьёт", attackerSide: "enemy" });
  }
  if ((enemy.skillCd[skill.id] || 0) > 0) {
    return executeAttack(enemy, player, { mult: 1, label: "бьёт", attackerSide: "enemy" });
  }

  enemy.mana -= skill.cost;
  if (skill.cooldown) {
    enemy.skillCd[skill.id] = skill.cooldown;
  }

  if (skill.heal) {
    const r = executeAttack(enemy, player, {
      mult: skill.mult,
      label: `творит «${skill.name}»`,
      attackerSide: "enemy",
      applyStatus: skill.applyStatus,
    });
    const healed = Math.min(skill.heal, enemy.maxHp - enemy.hp);
    enemy.hp += healed;
    syncUI();
    return {
      hit: r.hit,
      log: r.log.replace(/\.$/, "") + ` ${enemy.name} восстанавливает ${healed} HP.`,
    };
  }

  return executeAttack(enemy, player, {
    mult: skill.mult,
    label: `творит «${skill.name}»`,
    attackerSide: "enemy",
    applyStatus: skill.applyStatus,
  });
}

function chooseEnemyAction() {
  const e = state.enemy;
  const options = [];

  options.push({ type: "attack", weight: 3 });
  options.push({ type: "guard", weight: 1 });

  e.skillList.forEach((s) => {
    const cd = e.skillCd[s.id] || 0;
    if (e.mana >= s.cost && cd <= 0) {
      options.push({ type: "skill", skillId: s.id, weight: 2 });
    }
  });

  const total = options.reduce((a, o) => a + o.weight, 0);
  const r = Math.random() * total;
  let cum = 0;
  for (const o of options) {
    cum += o.weight;
    if (r < cum) {
      return o.type === "skill" ? { type: "skill", skillId: o.skillId } : { type: o.type };
    }
  }
  return { type: "attack" };
}

function finishBattle(playerWon) {
  state.finished = true;
  state.busy = false;
  toggleActions(true);
  el.restartBtn.classList.remove("hidden");

  if (playerWon) {
    state.wins += 1;
    appendLog(`Сцена закрыта: ${state.player.name} одерживает верх над ${state.enemy.name}.`);
    if (state.wins >= 3 && state.wins % 3 === 0) {
      appendLog("Кампания шепчет: серия побед — мастер может выдать дополнительную награду за столом.");
    }
    el.playerStatus.textContent = "Победа!";
    el.enemyStatus.textContent = "Повержен";
  } else {
    appendLog("Партия пала в этой сцене. Новый лист — новая попытка.");
    el.playerStatus.textContent = "Нокаут";
    el.enemyStatus.textContent = "Победа врага";
  }
  syncUI();
}

function toggleActions(disabled) {
  const lock = disabled || state.finished;
  el.baseActions.forEach((btn) => {
    btn.disabled = lock;
  });
  el.skillBar.querySelectorAll(".skill-btn").forEach((btn) => {
    const id = btn.dataset.skillId;
    const sk = findSkill(state.player, id);
    if (!sk) {
      return;
    }
    const cd = state.player.skillCd[id] || 0;
    const cant = lock || state.player.mana < sk.cost || cd > 0;
    btn.disabled = cant;
    btn.classList.toggle("skill-btn--cd", cd > 0 && !lock);
  });
}

function syncUI() {
  if (!state.player || !state.enemy) {
    return;
  }

  el.playerName.textContent = state.player.name;
  applySigil(el.playerAvatar, state.player);
  el.playerHpText.textContent = `HP: ${state.player.hp}/${state.player.maxHp}`;
  el.playerHpBar.style.width = `${(state.player.hp / state.player.maxHp) * 100}%`;
  el.playerManaText.textContent = `Мана: ${state.player.mana}/${state.player.maxMana}`;
  el.playerManaBar.style.width = `${(state.player.mana / state.player.maxMana) * 100}%`;
  if (el.playerEffects) {
    el.playerEffects.innerHTML = effectStripHtml(state.player);
  }

  el.enemyName.textContent = state.enemy.name;
  applySigil(el.enemyAvatar, state.enemy);
  el.enemyHpText.textContent = `HP: ${state.enemy.hp}/${state.enemy.maxHp}`;
  el.enemyHpBar.style.width = `${(state.enemy.hp / state.enemy.maxHp) * 100}%`;
  el.enemyManaText.textContent = `Мана: ${state.enemy.mana}/${state.enemy.maxMana}`;
  el.enemyManaBar.style.width = `${(state.enemy.mana / state.enemy.maxMana) * 100}%`;
  if (el.enemyEffects) {
    el.enemyEffects.innerHTML = effectStripHtml(state.enemy);
  }

  el.round.textContent = String(state.round);
  el.combo.textContent = String(state.combo);
  el.wins.textContent = String(state.wins);

  el.skillBar.querySelectorAll(".skill-btn").forEach((btn) => {
    const id = btn.dataset.skillId;
    const sk = findSkill(state.player, id);
    if (!sk) {
      return;
    }
    const cd = state.player.skillCd[id] || 0;
    const nameEl = btn.querySelector(".skill-btn__name");
    if (nameEl && cd > 0) {
      nameEl.textContent = `${sk.name} (${cd})`;
    } else if (nameEl) {
      nameEl.textContent = sk.name;
    }
  });
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
