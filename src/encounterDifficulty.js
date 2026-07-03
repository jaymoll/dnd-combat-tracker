export const PLAYER_XP_THRESHOLDS = {
  1: { easy: 25, medium: 50, hard: 75, deadly: 100 },
  2: { easy: 50, medium: 100, hard: 150, deadly: 200 },
  3: { easy: 75, medium: 150, hard: 225, deadly: 400 },
  4: { easy: 125, medium: 250, hard: 375, deadly: 500 },
  5: { easy: 250, medium: 500, hard: 750, deadly: 1100 },
  6: { easy: 300, medium: 600, hard: 900, deadly: 1400 },
  7: { easy: 350, medium: 750, hard: 1100, deadly: 1700 },
  8: { easy: 450, medium: 900, hard: 1400, deadly: 2100 },
  9: { easy: 550, medium: 1100, hard: 1600, deadly: 2400 },
  10: { easy: 600, medium: 1200, hard: 1900, deadly: 2800 },
  11: { easy: 800, medium: 1600, hard: 2400, deadly: 3600 },
  12: { easy: 1000, medium: 2000, hard: 3000, deadly: 4500 },
  13: { easy: 1100, medium: 2200, hard: 3400, deadly: 5100 },
  14: { easy: 1250, medium: 2500, hard: 3800, deadly: 5700 },
  15: { easy: 1400, medium: 2800, hard: 4300, deadly: 6400 },
  16: { easy: 1600, medium: 3200, hard: 4800, deadly: 7200 },
  17: { easy: 2000, medium: 3900, hard: 5900, deadly: 8800 },
  18: { easy: 2100, medium: 4200, hard: 6300, deadly: 9500 },
  19: { easy: 2400, medium: 4900, hard: 7300, deadly: 10900 },
  20: { easy: 2800, medium: 5700, hard: 8500, deadly: 12700 },
};

export const CHALLENGE_RATING_XP = {
  "0": 10,
  "1/8": 25,
  "1/4": 50,
  "1/2": 100,
  "1": 200,
  "2": 450,
  "3": 700,
  "4": 1100,
  "5": 1800,
  "6": 2300,
  "7": 2900,
  "8": 3900,
  "9": 5000,
  "10": 5900,
  "11": 7200,
  "12": 8400,
  "13": 10000,
  "14": 11500,
  "15": 13000,
  "16": 15000,
  "17": 18000,
  "18": 20000,
  "19": 22000,
  "20": 25000,
  "21": 33000,
  "22": 41000,
  "23": 50000,
  "24": 62000,
  "25": 75000,
  "26": 90000,
  "27": 105000,
  "28": 120000,
  "29": 135000,
  "30": 155000,
};

const emptyThresholds = () => ({ easy: 0, medium: 0, hard: 0, deadly: 0 });

export const normalizeChallengeRating = (challengeRating) => {
  const value = String(challengeRating ?? "")
    .trim()
    .toLowerCase()
    .replace(/^cr\s*/i, "")
    .replace(/\s+/g, "");

  if (!value) return "";

  const decimalToFraction = {
    "0.125": "1/8",
    ".125": "1/8",
    "0.25": "1/4",
    ".25": "1/4",
    "0.5": "1/2",
    ".5": "1/2",
  };

  if (decimalToFraction[value]) return decimalToFraction[value];

  const number = Number(value);
  if (Number.isInteger(number) && number >= 0) return String(number);

  return value;
};

export const getXpByCr = (challengeRating) => CHALLENGE_RATING_XP[normalizeChallengeRating(challengeRating)] ?? null;

export const getPlayerXpThresholds = (level) => PLAYER_XP_THRESHOLDS[Number(level)] ?? null;

export const calculatePartyThresholds = (levels) =>
  levels.reduce((totals, level) => {
    const thresholds = getPlayerXpThresholds(level);
    if (!thresholds) return totals;

    return {
      easy: totals.easy + thresholds.easy,
      medium: totals.medium + thresholds.medium,
      hard: totals.hard + thresholds.hard,
      deadly: totals.deadly + thresholds.deadly,
    };
  }, emptyThresholds());

export const getEncounterMultiplier = (monsterCount) => {
  if (monsterCount <= 0) return 0;
  if (monsterCount === 1) return 1;
  if (monsterCount === 2) return 1.5;
  if (monsterCount <= 6) return 2;
  if (monsterCount <= 10) return 2.5;
  if (monsterCount <= 14) return 3;
  return 4;
};

export const calculateMonsterXp = (monsters) => {
  const totals = monsters.reduce(
    (result, monster) => {
      const quantity = Math.max(Number.parseInt(monster.quantity, 10) || 0, 0);
      const xp = getXpByCr(monster.challengeRating);

      if (quantity < 1 || xp === null) {
        return {
          ...result,
          invalidMonsters: [...result.invalidMonsters, monster],
        };
      }

      return {
        ...result,
        baseXp: result.baseXp + xp * quantity,
        monsterCount: result.monsterCount + quantity,
      };
    },
    { baseXp: 0, monsterCount: 0, invalidMonsters: [] },
  );

  const multiplier = getEncounterMultiplier(totals.monsterCount);

  return {
    ...totals,
    multiplier,
    adjustedXp: totals.baseXp * multiplier,
  };
};

export const determineFinalDifficulty = (adjustedMonsterXp, partyThresholds) => {
  if (adjustedMonsterXp >= partyThresholds.deadly && partyThresholds.deadly > 0) return "Deadly";
  if (adjustedMonsterXp >= partyThresholds.hard && partyThresholds.hard > 0) return "Hard";
  if (adjustedMonsterXp >= partyThresholds.medium && partyThresholds.medium > 0) return "Medium";
  if (adjustedMonsterXp >= partyThresholds.easy && partyThresholds.easy > 0) return "Easy";
  return "Trivial";
};

export const calculateEncounterDifficulty = ({ partyLevels, monsters }) => {
  const partyThresholds = calculatePartyThresholds(partyLevels);
  const monsterXp = calculateMonsterXp(monsters);

  return {
    partyThresholds,
    ...monsterXp,
    difficulty: determineFinalDifficulty(monsterXp.adjustedXp, partyThresholds),
  };
};
