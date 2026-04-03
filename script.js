/**
 * Бой в духе D&D 5e (упрощ.): бросок d20 + бонус против КД; урон — кости d8 + модификатор.
 * Преимущество к типу атаки: +2 к броску атаки (как упрощённое преимущество).
 */

const EFFECT_TYPES = {
  fire: { label: "Огонь", dot: 5 },
  poison: { label: "Яд", dot: 4 },
  bleed: { label: "Кровотечение", dot: 3 },
  cold: { label: "Мороз", dot: 0, reduceNextDamage: 0.82 },
};

const CLASS_RULES = {
  fighter: { name: "Воин", advantageOn: ["weapon"] },
  cleric: { name: "Жрец", advantageOn: ["spell"] },
  ranger: { name: "Следопыт", advantageOn: ["weapon"] },
};

const SCENARIO_POPUPS = [
  "Сталь звенит — вы ловите ритм размена.",
  "Противник перехватывает дыхание; вы нет.",
  "На миг видна брешь в его стойке.",
  "Старая рана нычёт, но рука не дрожит.",
  "Следующий выпад рисуется сам — мышцы уже знают.",
  "Искры от удара щекочут лицо; вы не моргаете.",
  "Враг заводит слишком широко — вы это видите.",
  "Холод стали на запястье — хватка крепка.",
  "Он моргает на долю секунды раньше вас.",
  "Вес переносится на переднюю ногу — удар готов.",
];

const MICRO_SCENARIOS = [
  {
    title: "Размен",
    text: "Противник заносит удар — вы в ответе. Как бьёте?",
    choices: [
      { label: "Контрудар в корпус", log: "В схватке: вы бьёте первым в окно — +2 к следующему броску атаки.", effects: { player: { sceneAttackBonus: 2 } } },
      { label: "Отступить на шаг и перевести дух", log: "В схватке: секунда передышки — +14 HP.", effects: { player: { heal: 14 } } },
      { label: "Рискнуть всем телом", log: "В схватке: вы открываетесь ради угла — следующий удар по вам больнее, зато враг на миг без защиты (+1d8 при вашем попадании).", effects: { player: { sceneCursed: true }, enemy: { sceneExposed: true } } },
    ],
  },
  {
    title: "Стойка врага",
    text: "Он переносит вес — щит или клинок уезжают. Что делаете?",
    choices: [
      { label: "Ударить по руке", log: "В схватке: он промахивается по силе — его следующий бросок атаки с штрафом −2.", effects: { enemy: { sceneAttackPenalty: 2 } } },
      { label: "Не форсировать — копить магию", log: "В схватке: вы экономите волю — +10 маны.", effects: { player: { mana: 10 } } },
      { label: "Накрыть линию удара", log: "В схватке: вы загоняете его под угол — он уязвим (+1d8 к вашему следующему попаданию).", effects: { enemy: { sceneExposed: true } } },
    ],
  },
  {
    title: "Кровь за преимущество",
    text: "Можно обменять удар на выгодную позицию. Ваш выбор?",
    choices: [
      { label: "Принять лёгкий удар", log: "В схватке: −12 HP, зато следующая атака с +2 к броску.", effects: { player: { hpCost: 12, sceneAttackBonus: 2 } } },
      { label: "Держать дистанцию", log: "В схватке: вы не лезете в обмен — без бонусов и без риска.", effects: {} },
      { label: "Обмануть корпусом", log: "В схватке: он клюёт на ложь — +8 маны, враг теряет бдительность (+1d8 при попадании).", effects: { player: { mana: 8 }, enemy: { sceneExposed: true } } },
    ],
  },
  {
    title: "Пауза в линии",
    text: "На секунду оба замираете в читании дистанции.",
    choices: [
      { label: "Сжать рану и давить дальше", log: "В схватке: адреналин загоняет кровь назад — +18 HP, но следующий удар врага по вам сильнее.", effects: { player: { heal: 18, sceneCursed: true } } },
      { label: "Не спешить — выбрать цель", log: "В схватке: холодная голова — +2 к следующей атаке.", effects: { player: { sceneAttackBonus: 2 } } },
      { label: "Швырнуть песок / грязь в лицо", log: "В схватке: враг на миг слеп — его следующая атака с −2.", effects: { enemy: { sceneAttackPenalty: 2 } } },
    ],
  },
];

const heroes = [
  {
    id: "solaris",
    name: "Соларис Нёбесный",
    classId: "cleric",
    sigil: "S",
    sigilColor: "#c9a227",
    ac: 16,
    profBonus: 3,
    abilityMod: { weapon: 2, spell: 5 },
    maxHp: 168,
    maxMana: 100,
    manaRegen: 14,
    skills: [
      { id: "sol_1", name: "Священное пламя", cost: 18, kind: "damage", attackType: "spell", diceCount: 2, applyStatus: { type: "fire", turns: 2 } },
      { id: "sol_2", name: "Направляющий луч", cost: 32, kind: "damage", attackType: "spell", diceCount: 3 },
      { id: "sol_3", name: "Благословение удара", cost: 22, kind: "buff_next", nextMult: 1.45 },
      { id: "sol_4", name: "Лечение ран", cost: 25, kind: "heal", heal: 32 },
      { id: "sol_5", name: "Пламя небес", cost: 48, kind: "damage", attackType: "spell", diceCount: 4, cooldown: 2, applyStatus: { type: "fire", turns: 3 } },
    ],
  },
  {
    id: "torgun",
    name: "Торгун Каменный",
    classId: "fighter",
    sigil: "T",
    sigilColor: "#5c7a9e",
    ac: 18,
    profBonus: 3,
    abilityMod: { weapon: 5, spell: 1 },
    maxHp: 205,
    maxMana: 90,
    manaRegen: 12,
    skills: [
      { id: "tor_1", name: "Таран", cost: 12, kind: "damage", attackType: "weapon", diceCount: 2 },
      { id: "tor_2", name: "Стойка щитоносца", cost: 18, kind: "guard_heal", heal: 22 },
      { id: "tor_3", name: "Удар щитом", cost: 28, kind: "damage_heal", attackType: "weapon", diceCount: 2, heal: 12 },
      { id: "tor_4", name: "Сбить почву", cost: 20, kind: "debuff_enemy", weakMult: 0.62 },
      { id: "tor_5", name: "Сокрушитель", cost: 42, kind: "damage", attackType: "weapon", diceCount: 3, cooldown: 1, applyStatus: { type: "bleed", turns: 2 } },
    ],
  },
  {
    id: "keris",
    name: "Кэрис Ночная",
    classId: "ranger",
    sigil: "K",
    sigilColor: "#8b3a5c",
    ac: 15,
    profBonus: 3,
    abilityMod: { weapon: 5, spell: 2 },
    maxHp: 145,
    maxMana: 110,
    manaRegen: 13,
    skills: [
      { id: "ker_1", name: "Быстрый выпад", cost: 15, kind: "damage", attackType: "weapon", diceCount: 2, applyStatus: { type: "poison", turns: 2 } },
      { id: "ker_2", name: "Метка охотника", cost: 26, kind: "mark_crit" },
      { id: "ker_3", name: "Удар вампира", cost: 30, kind: "lifesteal", attackType: "weapon", diceCount: 3, steal: 0.38 },
      { id: "ker_4", name: "Ярость охотника", cost: 18, kind: "rage", rageTurns: 2 },
      { id: "ker_5", name: "Казнь тени", cost: 55, kind: "damage", attackType: "weapon", diceCount: 4, cooldown: 2, applyStatus: { type: "bleed", turns: 3 } },
    ],
  },
];

const bosses = [
  {
    id: "xarth",
    name: "Тень из Ксарта",
    sigil: "X",
    sigilColor: "#4a4a6a",
    ac: 15,
    profBonus: 3,
    abilityMod: { weapon: 4, spell: 5 },
    advantageOn: ["spell"],
    maxHp: 218,
    maxMana: 95,
    manaRegen: 12,
    skills: [
      { id: "bx1", name: "Хватка сумерек", cost: 14, attackType: "spell", diceCount: 2, applyStatus: { type: "cold", turns: 1 } },
      { id: "bx2", name: "Волна тьмы", cost: 28, attackType: "spell", diceCount: 3 },
      { id: "bx3", name: "Пожирание жизни", cost: 22, attackType: "spell", diceCount: 2, heal: 16 },
      { id: "bx4", name: "Кошмарный вид", cost: 38, attackType: "spell", diceCount: 3, cooldown: 1, applyStatus: { type: "poison", turns: 2 } },
    ],
  },
  {
    id: "mordvin",
    name: "Мордвин Ледяной",
    sigil: "M",
    sigilColor: "#5a8aaa",
    ac: 16,
    profBonus: 3,
    abilityMod: { weapon: 3, spell: 5 },
    advantageOn: ["spell"],
    maxHp: 200,
    maxMana: 100,
    manaRegen: 13,
    skills: [
      { id: "bm1", name: "Ледяной шип", cost: 13, attackType: "spell", diceCount: 2, applyStatus: { type: "cold", turns: 1 } },
      { id: "bm2", name: "Морозная волна", cost: 26, attackType: "spell", diceCount: 3 },
      { id: "bm3", name: "Град стрел", cost: 32, attackType: "spell", diceCount: 3 },
      { id: "bm4", name: "Ледяная могила", cost: 44, attackType: "spell", diceCount: 4, cooldown: 2, applyStatus: { type: "cold", turns: 2 } },
    ],
  },
  {
    id: "kurn",
    name: "Курн Железнорожный",
    sigil: "G",
    sigilColor: "#7a7a82",
    ac: 17,
    profBonus: 3,
    abilityMod: { weapon: 6, spell: 2 },
    advantageOn: ["weapon"],
    maxHp: 238,
    maxMana: 85,
    manaRegen: 11,
    skills: [
      { id: "bk1", name: "Каменный кулак", cost: 12, attackType: "weapon", diceCount: 2 },
      { id: "bk2", name: "Обвал", cost: 24, attackType: "weapon", diceCount: 3 },
      { id: "bk3", name: "Слить камень", cost: 20, attackType: "weapon", diceCount: 2, heal: 22 },
      { id: "bk4", name: "Перегрев ядра", cost: 40, attackType: "weapon", diceCount: 3, cooldown: 1, applyStatus: { type: "fire", turns: 2 } },
    ],
  },
  {
    id: "loren",
    name: "Лорен Изумрудная",
    sigil: "V",
    sigilColor: "#8b1538",
    ac: 15,
    profBonus: 3,
    abilityMod: { weapon: 5, spell: 3 },
    advantageOn: ["weapon"],
    maxHp: 188,
    maxMana: 105,
    manaRegen: 14,
    skills: [
      { id: "bl1", name: "Бич крови", cost: 15, attackType: "weapon", diceCount: 2, applyStatus: { type: "bleed", turns: 2 } },
      { id: "bl2", name: "Пир клинков", cost: 29, attackType: "weapon", diceCount: 3 },
      { id: "bl3", name: "Укус", cost: 24, attackType: "weapon", diceCount: 2, heal: 18, applyStatus: { type: "poison", turns: 1 } },
      { id: "bl4", name: "Кровавый обет", cost: 46, attackType: "weapon", diceCount: 4, cooldown: 2, applyStatus: { type: "bleed", turns: 3 } },
    ],
  },
  {
    id: "vorn",
    name: "Архимаг Ворн",
    sigil: "A",
    sigilColor: "#6b4c9c",
    ac: 14,
    profBonus: 3,
    abilityMod: { weapon: 3, spell: 6 },
    advantageOn: ["spell"],
    maxHp: 208,
    maxMana: 110,
    manaRegen: 15,
    skills: [
      { id: "bz1", name: "Снаряд силы", cost: 14, attackType: "spell", diceCount: 2, applyStatus: { type: "fire", turns: 1 } },
      { id: "bz2", name: "Проклятие", cost: 27, attackType: "spell", diceCount: 3, applyStatus: { type: "poison", turns: 2 } },
      { id: "bz3", name: "Жертва силы", cost: 18, attackType: "spell", diceCount: 2, heal: 20 },
      { id: "bz4", name: "Метеор Ворна", cost: 48, attackType: "spell", diceCount: 4, cooldown: 2, applyStatus: { type: "fire", turns: 2 } },
    ],
  },
];

const ENCOUNTER_FLAVOR = [
  "Первый удар уже нанесён — размен открыт.",
  "Дыхание рвётся в такт ударам; некуда отступать — только вперёд и в сталь.",
  "Противник уже в дистанции: клинки скрещены, счёт раундов пошёл.",
  "Кости на столе отложены — сейчас решает только схватка.",
  "Инициатива ваша: враг не ждёт пощады.",
];

const state = {
  player: null,
  enemy: null,
  round: 1,
  combo: 0,
  wins: 0,
  busy: false,
  finished: false,
  playerTurnDisplay: { attackLine: "", damageLine: "" },
  enemyTurnDisplay: { attackLine: "", damageLine: "" },
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
  dicePAttack: document.querySelector("#dice-p-attack"),
  dicePDamage: document.querySelector("#dice-p-damage"),
  diceEAttack: document.querySelector("#dice-e-attack"),
  diceEDamage: document.querySelector("#dice-e-damage"),
  toastRoot: document.querySelector("#toast-root"),
  diceModal: document.querySelector("#dice-modal"),
  diceModalTitle: document.querySelector("#dice-modal-title"),
  diceStage: document.querySelector("#dice-stage"),
  diceModalDetail: document.querySelector("#dice-modal-detail"),
  scenarioModal: document.querySelector("#scenario-modal"),
  scenarioModalTitle: document.querySelector("#scenario-modal-title"),
  scenarioModalText: document.querySelector("#scenario-modal-text"),
  scenarioModalChoices: document.querySelector("#scenario-modal-choices"),
  diceAuto: document.querySelector("#dice-auto"),
  attackDiceHint: document.querySelector("#attack-dice-hint"),
};

renderHeroPicker();
wireActions();

function rollD20() {
  return 1 + Math.floor(Math.random() * 20);
}

function rollD8() {
  return 1 + Math.floor(Math.random() * 8);
}

function rollNd8(n) {
  const rolls = [];
  for (let i = 0; i < n; i++) {
    rolls.push(rollD8());
  }
  return { rolls, sum: rolls.reduce((a, b) => a + b, 0) };
}

function getDiceAuto() {
  return localStorage.getItem("moduleBattleDiceAuto") !== "false";
}

function setDiceAuto(v) {
  localStorage.setItem("moduleBattleDiceAuto", v ? "true" : "false");
}

function openDiceModal() {
  if (!el.diceModal) {
    return;
  }
  el.diceModal.classList.remove("hidden");
  el.diceModal.setAttribute("aria-hidden", "false");
}

function closeDiceModal() {
  if (!el.diceModal) {
    return;
  }
  el.diceModal.classList.add("hidden");
  el.diceModal.setAttribute("aria-hidden", "true");
}

async function animateD20Roll(finalValue) {
  if (getDiceAuto()) {
    return;
  }
  openDiceModal();
  if (el.diceModalTitle) {
    el.diceModalTitle.textContent = "Бросок d20 — атака";
  }
  if (el.diceStage) {
    el.diceStage.innerHTML = `<div class="die-face die-face--lg" id="die-d20-face">?</div>`;
  }
  if (el.diceModalDetail) {
    el.diceModalDetail.textContent = "";
  }
  const face = document.getElementById("die-d20-face");
  await new Promise((resolve) => {
    let steps = 0;
    const t = setInterval(() => {
      if (face) {
        face.textContent = String(1 + Math.floor(Math.random() * 20));
      }
      steps++;
      if (steps > 16) {
        clearInterval(t);
        if (face) {
          face.textContent = String(finalValue);
          face.classList.add("die-face--land");
        }
        if (el.diceModalDetail) {
          el.diceModalDetail.textContent = `Результат: ${finalValue}`;
        }
        setTimeout(() => {
          closeDiceModal();
          resolve();
        }, 520);
      }
    }, 42);
  });
}

async function animateNd8Rolls(result) {
  if (getDiceAuto()) {
    return;
  }
  openDiceModal();
  if (el.diceModalTitle) {
    el.diceModalTitle.textContent = `Урон: ${result.rolls.length}d8`;
  }
  if (el.diceStage) {
    el.diceStage.innerHTML = result.rolls
      .map((_, i) => `<span class="die-face die-face--sm" id="d8-face-${i}">?</span>`)
      .join("");
  }
  if (el.diceModalDetail) {
    el.diceModalDetail.textContent = "";
  }
  await new Promise((resolve) => {
    let steps = 0;
    const t = setInterval(() => {
      result.rolls.forEach((_, i) => {
        const eld = document.getElementById(`d8-face-${i}`);
        if (eld) {
          eld.textContent = String(1 + Math.floor(Math.random() * 8));
        }
      });
      steps++;
      if (steps > 16) {
        clearInterval(t);
        result.rolls.forEach((v, i) => {
          const eld = document.getElementById(`d8-face-${i}`);
          if (eld) {
            eld.textContent = String(v);
            eld.classList.add("die-face--land");
          }
        });
        if (el.diceModalDetail) {
          el.diceModalDetail.textContent = `Сумма костей: ${result.sum} (+ модификатор в журнале)`;
        }
        setTimeout(() => {
          closeDiceModal();
          resolve();
        }, 560);
      }
    }, 42);
  });
}

async function rollD20Interactive() {
  const v = rollD20();
  await animateD20Roll(v);
  return v;
}

async function rollNd8Interactive(n) {
  const rolls = [];
  for (let i = 0; i < n; i++) {
    rolls.push(rollD8());
  }
  const result = { rolls, sum: rolls.reduce((a, b) => a + b, 0) };
  await animateNd8Rolls(result);
  return result;
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

function applyScenarioChoiceEffects(ch) {
  const eff = ch.effects;
  if (!eff) {
    return;
  }
  const { player: p, enemy: e } = eff;
  if (p) {
    if (p.sceneAttackBonus) {
      state.player.sceneAttackBonus += p.sceneAttackBonus;
    }
    if (p.sceneCursed) {
      state.player.sceneCursed = true;
    }
    if (p.heal) {
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + p.heal);
    }
    if (p.hpCost) {
      state.player.hp = Math.max(1, state.player.hp - p.hpCost);
    }
    if (p.mana) {
      state.player.mana = Math.min(state.player.maxMana, state.player.mana + p.mana);
    }
  }
  if (e) {
    if (e.sceneAttackPenalty) {
      state.enemy.sceneAttackPenalty += e.sceneAttackPenalty;
    }
    if (e.sceneExposed) {
      state.enemy.sceneExposed = true;
    }
  }
  syncUI();
}

function showScenarioModal(scenario) {
  return new Promise((resolve) => {
    if (!el.scenarioModal || !el.scenarioModalTitle || !el.scenarioModalText || !el.scenarioModalChoices) {
      resolve();
      return;
    }
    el.scenarioModalTitle.textContent = scenario.title;
    el.scenarioModalText.textContent = scenario.text;
    el.scenarioModalChoices.innerHTML = "";
    el.scenarioModal.classList.remove("hidden");
    el.scenarioModal.setAttribute("aria-hidden", "false");
    scenario.choices.forEach((ch) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "scenario-choice-btn";
      b.textContent = ch.label;
      b.addEventListener("click", () => {
        applyScenarioChoiceEffects(ch);
        if (ch.log) {
          appendLog(ch.log);
        }
        el.scenarioModal.classList.add("hidden");
        el.scenarioModal.setAttribute("aria-hidden", "true");
        resolve();
      });
      el.scenarioModalChoices.appendChild(b);
    });
  });
}

async function maybeMicroScenarioAtTurnStart() {
  if (state.round < 2) {
    return;
  }
  if (Math.random() > 0.24) {
    return;
  }
  const scenario = MICRO_SCENARIOS[Math.floor(Math.random() * MICRO_SCENARIOS.length)];
  await showScenarioModal(scenario);
}

function applySigil(domEl, fighter) {
  if (!domEl || !fighter) {
    return;
  }
  domEl.textContent = fighter.sigil;
  domEl.style.setProperty("--sigil-bg", fighter.sigilColor);
}

function hasAdvantage(attacker, attackType) {
  if (attacker.classId && CLASS_RULES[attacker.classId]) {
    return CLASS_RULES[attacker.classId].advantageOn.includes(attackType);
  }
  if (attacker.advantageOn) {
    return attacker.advantageOn.includes(attackType);
  }
  return false;
}

function attackBonusTotal(attacker, attackType) {
  const prof = attacker.profBonus ?? 3;
  const mod = attacker.abilityMod?.[attackType] ?? 2;
  const adv = hasAdvantage(attacker, attackType) ? 2 : 0;
  return { prof, mod, adv, total: prof + mod + adv };
}

async function resolveAttackRoll(attacker, defender, attackType) {
  const d20 = await rollD20Interactive();
  const { prof, mod, adv, total: bonus } = attackBonusTotal(attacker, attackType);
  let sceneExtra = 0;
  if (attacker.sceneAttackBonus) {
    sceneExtra += attacker.sceneAttackBonus;
    attacker.sceneAttackBonus = 0;
  }
  if (attacker.sceneAttackPenalty) {
    sceneExtra -= attacker.sceneAttackPenalty;
    attacker.sceneAttackPenalty = 0;
  }
  const total = d20 + bonus + sceneExtra;
  const ac = defender.ac;

  if (d20 === 1) {
    return { d20, bonus, sceneExtra, total, ac, hit: false, isCrit: false, isFumble: true, adv };
  }
  if (d20 === 20) {
    return { d20, bonus, sceneExtra, total, ac, hit: true, isCrit: true, isFumble: false, adv };
  }
  const hit = total >= ac;
  return { d20, bonus, sceneExtra, total, ac, hit, isCrit: false, isFumble: false, adv };
}

function formatAttackLine(sideLabel, ar, defenderName) {
  if (!ar) {
    return `${sideLabel}: —`;
  }
  const advText = ar.adv ? " преим." : "";
  const se =
    ar.sceneExtra !== 0 && ar.sceneExtra !== undefined
      ? ` ${ar.sceneExtra > 0 ? "+" : ""}${ar.sceneExtra} тактика`
      : "";
  if (ar.isFumble) {
    return `${sideLabel}: d20=${ar.d20} — автоматический промах.`;
  }
  if (ar.isCrit) {
    return `${sideLabel}: d20=${ar.d20} + ${ar.bonus}${advText}${se} = ${ar.total} vs КД ${ar.ac} (${defenderName}) — крит!`;
  }
  if (ar.hit) {
    return `${sideLabel}: d20=${ar.d20} + ${ar.bonus}${advText}${se} = ${ar.total} vs КД ${ar.ac} — попадание.`;
  }
  return `${sideLabel}: d20=${ar.d20} + ${ar.bonus}${advText}${se} = ${ar.total} vs КД ${ar.ac} — мимо.`;
}

function getDamageMod(attacker, attackType) {
  let m = attacker.abilityMod?.[attackType] ?? 2;
  if (attacker === state.player && attacker.rageTurns > 0 && attackType === "weapon") {
    m += 2;
  }
  return m;
}

async function resolveDamageStrike(attacker, defender, opts) {
  const { attackType, diceCount, applyStatus, label, ar } = opts;
  let crit = ar.isCrit;
  if (attacker === state.player && attacker.guaranteedCrit) {
    crit = true;
    attacker.guaranteedCrit = false;
  }

  const mod = getDamageMod(attacker, attackType);
  const nDiceBase = crit ? diceCount * 2 : diceCount;
  let exposeExtra = 0;
  if (defender.sceneExposed && attacker === state.player && defender === state.enemy) {
    exposeExtra = 1;
    defender.sceneExposed = false;
  }
  const rollCount = nDiceBase + exposeExtra;
  const { rolls, sum } = await rollNd8Interactive(rollCount);
  let damage = sum + mod;

  if (attacker === state.player && attacker.nextDamageMult !== 1) {
    damage = Math.round(damage * attacker.nextDamageMult);
    attacker.nextDamageMult = 1;
  }

  damage = applyColdDamageMod(defender, damage);

  if (defender.guarding) {
    damage = Math.round(damage * 0.5);
  }

  if (attacker === state.enemy && attacker.attackWeakNext) {
    damage = Math.round(damage * 0.62);
    attacker.attackWeakNext = false;
  }

  if (defender === state.player && defender.sceneCursed && attacker === state.enemy) {
    damage = Math.round(damage * 1.25);
    defender.sceneCursed = false;
  }

  const spread = Math.floor(Math.random() * 3);
  damage = Math.max(1, damage + spread - 1);

  defender.hp = Math.max(0, defender.hp - damage);
  defender.guarding = false;

  if (applyStatus && defender.hp > 0) {
    addStatus(defender, applyStatus.type, applyStatus.turns);
  }

  if (attacker === state.player) {
    onPlayerDealtDamage();
  }

  syncUI();

  const rollsStr = rolls.join("+");
  const critTag = crit ? " Крит — удвоены d8." : "";
  const exposeTag = exposeExtra ? " +1d8 уязвимость." : "";
  const guardNote = opts.wasGuarding ? " Укрытие: половина урона." : "";

  const dmgLine = `${diceCount}d8${crit ? `→${nDiceBase}d8` : ""}${exposeTag} [${rollsStr}] + ${mod} = ${damage}${critTag}`;

  return {
    hit: true,
    log: `${attacker.name} ${label}: попадание — ${damage} урона. (${dmgLine})${guardNote}`,
    damageLine: dmgLine,
  };
}

async function executeWeaponAttack(attacker, defender, opts) {
  const attackType = "weapon";
  const ar = await resolveAttackRoll(attacker, defender, attackType);
  state[opts.displayKey || "playerTurnDisplay"].attackLine = formatAttackLine("Атака", ar, defender.name);
  state[opts.displayKey || "playerTurnDisplay"].damageLine = ar.hit ? "…" : "Урон: —";

  if (!ar.hit) {
    syncUI();
    updateDicePanel();
    return {
      hit: false,
      log: `${attacker.name} ${opts.label}: ${formatAttackLog(ar, defender.name)}`,
    };
  }

  const diceCount = opts.diceCount ?? 1;
  const r = await resolveDamageStrike(attacker, defender, {
    attackType,
    diceCount,
    applyStatus: opts.applyStatus,
    label: opts.label,
    ar,
    wasGuarding: defender.guarding,
  });
  state[opts.displayKey || "playerTurnDisplay"].damageLine = `Урон (d8): ${r.damageLine}`;
  updateDicePanel();
  return { hit: true, log: r.log };
}

function formatAttackLog(ar, defenderName) {
  if (ar.isFumble) {
    return `промах (1 на d20).`;
  }
  if (!ar.hit) {
    return `мимо (${ar.total} vs КД ${ar.ac} ${defenderName}).`;
  }
  return ``;
}

async function executeStrike(attacker, defender, opts) {
  const { attackType, diceCount, applyStatus, label, displayKey } = opts;
  const ar = await resolveAttackRoll(attacker, defender, attackType);
  const dk = displayKey || "playerTurnDisplay";
  state[dk].attackLine = formatAttackLine("Атака", ar, defender.name);
  state[dk].damageLine = ar.hit ? "…" : "Урон: —";

  if (!ar.hit) {
    syncUI();
    updateDicePanel();
    return {
      hit: false,
      log: `${attacker.name} ${label}: ${ar.isFumble ? "промах (1 на d20)." : `мимо (${ar.total} vs КД ${ar.ac}).`}`,
    };
  }

  const r = await resolveDamageStrike(attacker, defender, {
    attackType,
    diceCount,
    applyStatus,
    label,
    ar,
    wasGuarding: defender.guarding,
  });
  state[dk].damageLine = `Урон (d8): ${r.damageLine}`;
  updateDicePanel();

  return { hit: true, log: r.log };
}

function updateDicePanel() {
  if (el.dicePAttack) {
    el.dicePAttack.textContent = state.playerTurnDisplay.attackLine || "Атака: —";
  }
  if (el.dicePDamage) {
    el.dicePDamage.textContent = state.playerTurnDisplay.damageLine || "Урон (d8): —";
  }
  if (el.diceEAttack) {
    el.diceEAttack.textContent = state.enemyTurnDisplay.attackLine || "Атака: —";
  }
  if (el.diceEDamage) {
    el.diceEDamage.textContent = state.enemyTurnDisplay.damageLine || "Урон (d8): —";
  }
}

function cloneFighter(template, isPlayer) {
  const cls = template.classId ? CLASS_RULES[template.classId] : null;
  const f = {
    ...template,
    className: cls?.name ?? template.className ?? "Враг",
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
    sceneAttackBonus: 0,
    sceneAttackPenalty: 0,
    sceneExposed: false,
    sceneCursed: false,
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
    const c = CLASS_RULES[hero.classId];
    const button = document.createElement("button");
    button.className = "hero-btn";
    button.innerHTML = `
      <div class="hero-sigil" style="--sigil-bg:${hero.sigilColor}">${hero.sigil}</div>
      <div>
        <span class="hero-name">${hero.name}</span>
        <span class="hero-class">${c.name}</span>
        <span class="hero-stats">КД ${hero.ac} · HP ${hero.maxHp} · Мана ${hero.maxMana}</span>
      </div>
    `;
    button.addEventListener("click", () => startBattle(hero));
    el.heroGrid.appendChild(button);
  });
}

function skillDiceHint(player, skill) {
  if (!player || !skill) {
    return "";
  }
  if (skill.kind === "damage" || skill.kind === "lifesteal" || skill.kind === "damage_heal") {
    const at = skill.attackType || "spell";
    const atk = attackBonusTotal(player, at);
    const dm = getDamageMod(player, at);
    const n = skill.diceCount;
    const kind = at === "spell" ? "закл." : "оруж.";
    return `${kind} d20+${atk.total} · ${n}d8+${dm}`;
  }
  if (skill.kind === "heal") {
    return `+${skill.heal} HP`;
  }
  if (skill.kind === "buff_next") {
    return `урон ×${skill.nextMult}`;
  }
  if (skill.kind === "guard_heal") {
    return `укрыт · +${skill.heal} HP`;
  }
  if (skill.kind === "debuff_enemy") {
    return "враг −сила";
  }
  if (skill.kind === "mark_crit") {
    return "2×d8 след.";
  }
  if (skill.kind === "rage") {
    return `оруж. +2 · ${skill.rageTurns} уд.`;
  }
  return "";
}

function updateAttackDiceHint() {
  if (!el.attackDiceHint || !state.player) {
    return;
  }
  const p = state.player;
  const w = attackBonusTotal(p, "weapon");
  const dm = getDamageMod(p, "weapon");
  el.attackDiceHint.textContent = `Удар: d20+${w.total} · 1d8+${dm} (оружие)`;
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
    const hint = skillDiceHint(state.player, skill);
    btn.innerHTML = `<span class="skill-btn__name">${skill.name}</span><span class="skill-btn__dice">${hint}</span><span class="skill-btn__cost">${skill.cost} маны</span>`;
    btn.title = skillTip(skill);
    btn.addEventListener("click", () => {
      void runTurn("skill", skill.id);
    });
    el.skillBar.appendChild(btn);
  });
}

function skillTip(s) {
  const atk = s.attackType === "spell" ? "заклинание" : "оружие";
  if (s.kind === "damage") {
    let t = `${s.name}: бросок атаки (${atk}) vs КД, ${s.diceCount}d8 + мод`;
    if (s.cooldown) {
      t += `, перезарядка ${s.cooldown}`;
    }
    if (s.applyStatus) {
      t += ` · ${EFFECT_TYPES[s.applyStatus.type]?.label || ""}`;
    }
    return t;
  }
  if (s.kind === "heal") {
    return `${s.name}: +${s.heal} HP`;
  }
  if (s.kind === "buff_next") {
    return `${s.name}: следующий урон ×${s.nextMult}`;
  }
  if (s.kind === "guard_heal") {
    return `${s.name}: укрытие и +${s.heal} HP`;
  }
  if (s.kind === "damage_heal") {
    return `${s.name}: ${s.diceCount}d8 + мод, лечение +${s.heal}`;
  }
  if (s.kind === "debuff_enemy") {
    return `${s.name}: следующий удар врага слабее`;
  }
  if (s.kind === "mark_crit") {
    return `${s.name}: следующий удар — удвоение d8 (крит по урону)`;
  }
  if (s.kind === "lifesteal") {
    return `${s.name}: ${s.diceCount}d8, вампиризм ${Math.round(s.steal * 100)}%`;
  }
  if (s.kind === "rage") {
    return `${s.name}: +2 к урону оружием на ${s.rageTurns} удара`;
  }
  return s.name;
}

function startBattle(heroTemplate) {
  const bossTemplate = pickRandomBoss();
  state.player = cloneFighter(heroTemplate, true);
  state.enemy = cloneFighter(bossTemplate, false);
  state.round = 1;
  state.combo = 0;
  state.finished = false;
  state.busy = false;
  state.playerTurnDisplay = { attackLine: "Атака: —", damageLine: "Урон (d8): —" };
  state.enemyTurnDisplay = { attackLine: "Атака: —", damageLine: "Урон (d8): —" };
  el.heroPicker.classList.add("hidden");
  el.battle.classList.remove("hidden");
  el.restartBtn.classList.add("hidden");
  if (el.diceAuto) {
    el.diceAuto.checked = getDiceAuto();
  }
  renderSkillBar();
  toggleActions(false);
  resetLog();
  appendLog(randomFlavor());
  appendLog(`Схватка: ${state.player.name} (${state.player.className}) против ${state.enemy.name}, КД ${state.enemy.ac}. Бой идёт здесь и сейчас.`);
  updateDicePanel();
  syncUI();
}

function wireActions() {
  el.baseActions.forEach((btn) => {
    btn.addEventListener("click", () => {
      void runTurn(btn.dataset.action);
    });
  });
  if (el.diceAuto) {
    el.diceAuto.checked = getDiceAuto();
    el.diceAuto.addEventListener("change", () => {
      setDiceAuto(el.diceAuto.checked);
    });
  }
  el.restartBtn.addEventListener("click", () => {
    el.heroPicker.classList.remove("hidden");
    el.battle.classList.add("hidden");
    el.skillBar.innerHTML = "";
    if (el.toastRoot) {
      el.toastRoot.innerHTML = "";
    }
  });
}

async function runTurn(playerAction, skillId = null) {
  if (state.finished || state.busy) {
    return;
  }
  if (playerAction === "skill" && !skillId) {
    return;
  }

  state.playerTurnDisplay = { attackLine: "", damageLine: "" };
  maybeRandomScenarioPopup();

  state.busy = true;
  toggleActions(true);

  await maybeMicroScenarioAtTurnStart();

  state.player.guarding = playerAction === "guard";
  let playerResult;

  if (playerAction === "attack") {
    playerResult = await executeWeaponAttack(state.player, state.enemy, {
      label: "бьёт",
      diceCount: 1,
      displayKey: "playerTurnDisplay",
    });
  } else if (playerAction === "guard") {
    playerResult = executeGuard(state.player);
    state.playerTurnDisplay.attackLine = "Укрытие — броска атаки нет.";
    state.playerTurnDisplay.damageLine = "Урон: —";
    updateDicePanel();
  } else if (playerAction === "skill") {
    playerResult = await executeHeroSkill(state.player, state.enemy, skillId);
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

  setTimeout(async () => {
    state.enemyTurnDisplay = { attackLine: "", damageLine: "" };
    if (Math.random() < 0.28) {
      showToast(SCENARIO_POPUPS[Math.floor(Math.random() * SCENARIO_POPUPS.length)]);
    }

    const enemyMove = chooseEnemyAction();
    state.enemy.guarding = enemyMove.type === "guard";
    let enemyResult;
    if (enemyMove.type === "attack") {
      enemyResult = await executeWeaponAttack(state.enemy, state.player, {
        label: "бьёт",
        diceCount: 1,
        displayKey: "enemyTurnDisplay",
      });
    } else if (enemyMove.type === "guard") {
      enemyResult = executeGuard(state.enemy);
      state.enemyTurnDisplay.attackLine = "Укрытие — броска атаки нет.";
      state.enemyTurnDisplay.damageLine = "Урон: —";
      updateDicePanel();
    } else {
      enemyResult = await executeBossSkill(state.enemy, state.player, enemyMove.skillId);
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

function onPlayerDealtDamage() {
  if (state.player.rageTurns > 0) {
    state.player.rageTurns -= 1;
  }
}

function executeGuard(attacker) {
  attacker.guarding = true;
  syncUI();
  return { hit: false, log: `${attacker.name} занимает укрытие: при попадании урон уменьшается вдвое.` };
}

function findSkill(fighter, skillId) {
  return fighter.skillList.find((s) => s.id === skillId);
}

async function executeHeroSkill(player, enemy, skillId) {
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
      return executeStrike(player, enemy, {
        attackType: skill.attackType || "spell",
        diceCount: skill.diceCount,
        applyStatus: skill.applyStatus,
        label: `«${skill.name}»`,
        displayKey: "playerTurnDisplay",
      });
    }
    case "heal": {
      const healed = Math.min(skill.heal, player.maxHp - player.hp);
      player.hp += healed;
      syncUI();
      state.playerTurnDisplay.attackLine = "Лечение — без броска атаки.";
      state.playerTurnDisplay.damageLine = `+${healed} HP`;
      updateDicePanel();
      return { hit: false, log: `${player.name} творит «${skill.name}» и восстанавливает ${healed} HP.` };
    }
    case "buff_next": {
      player.nextDamageMult = skill.nextMult;
      syncUI();
      state.playerTurnDisplay.attackLine = "Бафф — следующий урон усилен.";
      state.playerTurnDisplay.damageLine = "—";
      updateDicePanel();
      return { hit: false, log: `${player.name}: «${skill.name}» — следующий успешный урон сильнее.` };
    }
    case "guard_heal": {
      player.guarding = true;
      const healed = Math.min(skill.heal, player.maxHp - player.hp);
      player.hp += healed;
      syncUI();
      state.playerTurnDisplay.attackLine = "Укрытие + лечение.";
      state.playerTurnDisplay.damageLine = `+${healed} HP`;
      updateDicePanel();
      return { hit: false, log: `${player.name} «${skill.name}»: укрытие и +${healed} HP.` };
    }
    case "damage_heal": {
      const r = await executeStrike(player, enemy, {
        attackType: skill.attackType || "weapon",
        diceCount: skill.diceCount,
        applyStatus: skill.applyStatus,
        label: `«${skill.name}»`,
        displayKey: "playerTurnDisplay",
      });
      const healed = Math.min(skill.heal, player.maxHp - player.hp);
      player.hp += healed;
      syncUI();
      return {
        hit: r.hit,
        log: r.hit ? `${r.log} Второе дыхание: +${healed} HP.` : r.log,
      };
    }
    case "debuff_enemy": {
      enemy.attackWeakNext = true;
      syncUI();
      state.playerTurnDisplay.attackLine = "Дебафф врага.";
      state.playerTurnDisplay.damageLine = "—";
      updateDicePanel();
      return { hit: false, log: `${player.name} «${skill.name}»: следующий удар врага слабее.` };
    }
    case "mark_crit": {
      player.guaranteedCrit = true;
      syncUI();
      state.playerTurnDisplay.attackLine = "Метка: следующий урон — удвоение d8.";
      state.playerTurnDisplay.damageLine = "—";
      updateDicePanel();
      return { hit: false, log: `${player.name} ставит «${skill.name}» — следующее попадание нанесёт критический урон (2×d8).` };
    }
    case "lifesteal": {
      const before = enemy.hp;
      const r = await executeStrike(player, enemy, {
        attackType: skill.attackType || "weapon",
        diceCount: skill.diceCount,
        applyStatus: skill.applyStatus,
        label: `«${skill.name}»`,
        displayKey: "playerTurnDisplay",
      });
      if (!r.hit) {
        return r;
      }
      const dealt = before - enemy.hp;
      const healed = Math.min(Math.floor(dealt * skill.steal), player.maxHp - player.hp);
      player.hp += healed;
      syncUI();
      return {
        hit: true,
        log: `${r.log} Высасывание: +${healed} HP.`,
      };
    }
    case "rage": {
      player.rageTurns = skill.rageTurns;
      syncUI();
      state.playerTurnDisplay.attackLine = "Ярость: +2 к урону оружием.";
      state.playerTurnDisplay.damageLine = `${skill.rageTurns} удара`;
      updateDicePanel();
      return {
        hit: false,
        log: `${player.name} впадает в «${skill.name}» (+2 к урону оружием на ${skill.rageTurns} удара).`,
      };
    }
    default:
      syncUI();
      return { hit: false, log: "Приём не сработал." };
  }
}

async function executeBossSkill(enemy, player, skillId) {
  const skill = findSkill(enemy, skillId);
  if (!skill) {
    return executeWeaponAttack(enemy, player, { label: "бьёт", diceCount: 1, displayKey: "enemyTurnDisplay" });
  }
  if (enemy.mana < skill.cost) {
    return executeWeaponAttack(enemy, player, { label: "бьёт", diceCount: 1, displayKey: "enemyTurnDisplay" });
  }
  if ((enemy.skillCd[skill.id] || 0) > 0) {
    return executeWeaponAttack(enemy, player, { label: "бьёт", diceCount: 1, displayKey: "enemyTurnDisplay" });
  }

  enemy.mana -= skill.cost;
  if (skill.cooldown) {
    enemy.skillCd[skill.id] = skill.cooldown;
  }

  if (skill.heal) {
    const r = await executeStrike(enemy, player, {
      attackType: skill.attackType || "spell",
      diceCount: skill.diceCount,
      applyStatus: skill.applyStatus,
      label: `«${skill.name}»`,
      displayKey: "enemyTurnDisplay",
    });
    const healed = Math.min(skill.heal, enemy.maxHp - enemy.hp);
    enemy.hp += healed;
    syncUI();
    return {
      hit: r.hit,
      log: r.hit ? `${r.log} ${enemy.name} восстанавливает ${healed} HP.` : r.log,
    };
  }

  return executeStrike(enemy, player, {
    attackType: skill.attackType || "weapon",
    diceCount: skill.diceCount,
    applyStatus: skill.applyStatus,
    label: `«${skill.name}»`,
    displayKey: "enemyTurnDisplay",
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
    appendLog(`Победа в схватке: ${state.player.name} ломает оборону ${state.enemy.name}.`);
    if (state.wins >= 3 && state.wins % 3 === 0) {
      appendLog("Серия побед в схватках — за столом мастер может выдать дополнительную награду.");
    }
    el.playerStatus.textContent = "Победа!";
    el.enemyStatus.textContent = "Повержен";
  } else {
    appendLog("Выбили из схватки — герой падает. Новый заход в бой.");
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

  el.playerName.textContent = `${state.player.name} · ${state.player.className}`;
  applySigil(el.playerAvatar, state.player);
  el.playerHpText.textContent = `HP: ${state.player.hp}/${state.player.maxHp} · КД ${state.player.ac}`;
  el.playerHpBar.style.width = `${(state.player.hp / state.player.maxHp) * 100}%`;
  el.playerManaText.textContent = `Мана: ${state.player.mana}/${state.player.maxMana}`;
  el.playerManaBar.style.width = `${(state.player.mana / state.player.maxMana) * 100}%`;
  if (el.playerEffects) {
    el.playerEffects.innerHTML = effectStripHtml(state.player);
  }

  el.enemyName.textContent = `${state.enemy.name} · КД ${state.enemy.ac}`;
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

  updateAttackDiceHint();
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
