# Combat Tracker

A Dockerized full-stack D&D combat tracker.

## Run With Docker

```bash
docker compose up --build
```

Open http://localhost:3000.

## Live Coding With Docker

```bash
docker compose -f docker-compose.yml -f docker-compose.watch.yml up --build
```

This bind-mounts `app.js`, `src/`, `index.html`, `styles.css`, `server.js`, and `storage` into the container. Frontend changes refresh in the browser, and `server.js` restarts through a polling watcher that works reliably with Docker Desktop file mounts.

The app stores quick-access characters, monsters, spells, and weapons in:

- `storage/characters.txt`
- `storage/monsters.txt`
- `storage/spells.txt`
- `storage/weapons.txt`

The files are mounted into the container by `docker-compose.yml`, so edits made through the app persist on your machine.

Spells use the same JSON-in-a-`.txt` format:

```json
[
  {
    "name": "Fire Bolt",
    "description": "A ranged spell attack that hurls a mote of fire.",
    "damageMin": 1,
    "damageMax": 10,
    "damageBonus": 0
  }
]
```

Weapons also use JSON-in-a-`.txt` format. Weapon attack and damage bonuses are calculated from the wielder's strength or dexterity score:

```json
[
  {
    "name": "Greataxe",
    "description": "A heavy axe swung with brute force.",
    "ability": "strength",
    "damageMin": 2,
    "damageMax": 12,
    "damageBonus": 0
  }
]
```

Monsters can also include a Monster Manual-style `statBlock` object. Direct monster damage is no longer stored on the monster; attacks come from assigned weapons and spells:

```json
{
  "name": "Orc Brute",
  "maxHp": 15,
  "currentHp": 15,
  "armorClass": 13,
  "attacksPerTurn": 2,
  "statBlock": {
    "size": "Medium",
    "creatureType": "humanoid",
    "alignment": "chaotic evil",
    "speed": "30 ft.",
    "strength": 16,
    "dexterity": 12,
    "constitution": 16,
    "intelligence": 7,
    "wisdom": 11,
    "charisma": 10,
    "savingThrows": "",
    "skills": "Intimidation +2",
    "damageVulnerabilities": "",
    "damageResistances": "",
    "damageImmunities": "",
    "conditionImmunities": "",
    "senses": "darkvision 60 ft., passive Perception 10",
    "languages": "Common, Orc",
    "challengeRating": "1/2",
    "spellcastingAbility": "wisdom",
    "traits": "Aggressive. As a bonus action, the orc can move up to its speed toward a hostile creature that it can see.",
    "actions": "Greataxe. Melee Weapon Attack using strength. Hit: 2-12 + STR slashing damage.",
    "reactions": "",
    "legendaryActions": ""
  },
  "spells": [],
  "weapons": [
    {
      "name": "Greataxe",
      "description": "A heavy axe swung with brute force.",
      "ability": "strength",
      "damageMin": 2,
      "damageMax": 12,
      "damageBonus": 0
    }
  ]
}
```

Attack and weapon damage bonuses use the D&D 5e ability modifier formula: `Math.floor((score - 10) / 2)`. For example, strength 14 gives `+2` to hit and damage with a strength weapon. Dexterity weapons use dexterity. Monster spells use the monster's selected `spellcastingAbility`, which can be intelligence, wisdom, or charisma.

Monster initiative is rolled as `d20 + DEX modifier`. Characters still use manually entered initiative.

## API

- `GET /api/library` returns saved characters, monsters, spells, and weapons.
- `POST /api/library/:type` saves a character, monster, spell, or weapon. `type` is `character`, `monster`, `spell`, or `weapon`.
- `PUT /api/library/:type/:id` updates a saved entry.
- `DELETE /api/library/:type/:id` removes a saved entry.
