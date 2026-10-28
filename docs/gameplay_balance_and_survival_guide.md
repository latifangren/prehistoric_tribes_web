# Gameplay balance, survival mechanics, and combat tactics guide

Kind: descriptive and normative | Audience: developers, game designers, and AI engineering agents | Purpose: record verified numerical formulas, survival mechanics, weather effects, and enemy AI tactical behaviors | Non-goals: replacing high-level system architecture in ARCHITECTURE.md

---

## 1. Summary

This document specifies the core gameplay balancing, resource logistics, environmental survival mechanics, and combat tactical behaviors for Prehistoric Tribes Web:
- Baseline villager carry capacity is scaled to 4 or 5 items per trip (`UNIT_CARRY_CAPACITY`), cutting early construction logistics time in half.
- Weather mechanics actively modify gameplay: rain slows foot travel by approximately 15% through mud and nourishes vegetation; snow drains outdoor energy by 1 point every 3 seconds unless villagers stand within a 4-tile warmth aura of completed tribal hearths or towers.
- Team 1 enemy AI raiders execute tactical standoff behaviors: ranged skirmishers maintain a 2 to 3 tile standoff distance behind melee vanguards rather than charging blindly into close combat.

---

## 2. Tribal economy and resource logistics

### 2.1 Food decay and starvation mortality
Villager hunger is tracked in `dense[UNIT_FOOD + id]` (byte offset 2020) with values ranging from 0 to 100:
- **Decay cadence:** Evaluated every 4 frames per unit (`(frame & 3) === (id & 3)`). Food decreases by 1 point every 15 to 25 frames based on job type, equivalent to 1 point every 1.8 to 3.0 seconds at 1x simulation speed (120 ms ticks).
- **Hunger response thresholds:**
  - Content villagers (happiness > 5) search for a Kitchen (type 4) only when `UNIT_FOOD <= 20`.
  - Stressed villagers (happiness <= 5) panic when `UNIT_FOOD <= 50`, dropping work assignments to seek food.
- **Starvation penalty:** When `UNIT_FOOD === 0`, `stepLegacyEntityHealthDelta(id, -1)` subtracts 1 HP every 2 seconds. A standard villager (40 HP) dies within approximately 80 seconds without nourishment.

### 2.2 Carry capacity and transport pacing
Stored in `dense[UNIT_CARRY_CAPACITY + id]` (offset 3737) and `dense[UNIT_CARRY_AMOUNT + id]` (offset 3636):
- **Capacity allocation:** Initialized in `web/src/sim/world/LegacyRecordAllocator.ts:89`:
  $$\text{capacity} = 4 + \text{random}(255, 2)$$
  Yields a baseline capacity of 4 or 5 items per trip, an increase from the legacy baseline of 2 or 3 items.
- **Logistical impact:** Transporting 30 wood for an initial hut at 12 tiles distance previously required 12 round trips (288 seconds for a single worker). At 5 items per trip, the requirement drops to 6 round trips (144 seconds), halving early village setup time while preserving survival tension.

---

## 3. Environmental survival and weather dynamics

Managed in `web/src/render/WeatherSystem.ts` and `DayNightCycle.ts`. Weather modes transition every 150 seconds (clear -> extreme -> clear):

### 3.1 Rain dynamics
- **Mud dampening:** Evaluated every 240 ms. Warga actively moving on outdoor tiles (modes 1 to 7) have their step counter reduced (`dense[5050 + id] = step - 1`), reducing foot speed by approximately 15% on wet terrain.
- **Vegetation replenishment:** Adds +1 food to the tribe stockpile every 3 seconds (`mainArrays.aShort[0][1]`).

### 3.2 Snow survival and warmth aura
- **Freezing drain:** Every 3 seconds, outdoor villagers outside warmth lose 1 point of energy (`dense[UNIT_ENERGY + id]`), down to a minimum floor of 5.
- **Warmth aura protection:** Freezing drain is prevented if a villager stands within 4 tiles ($\text{distance} \le 4.0$) of an active, completed heat source (`BLD_HP > 0 && BLD_KIND < 12`):
  - Kind 3: Chief's Hut (tribal campfire hub, radius 145 px visual).
  - Kind 4: Kitchen (cooking hearth, radius 85 px visual).
  - Kind 7: Disco (celebration bonfire, radius 110 px visual).
  - Kind 8: Sanctuary (shamanic braziers, radius 105 px visual).
  - Kind 11: Lookout Tower (watch torch, radius 95 px visual).

### 3.3 Day and night diurnal cycle
A full 24-hour in-game day spans 360 seconds (6 minutes of real time at 1x speed):
- **Night rest (21:00 to 05:00):** Idle villagers return to their assigned hut, recovering +2 energy every 2.5 seconds up to 99.
- **Campfire social (18:30 to 20:48):** Villagers relaxing near the central fire or disco gain happiness up to 85.
- **Dawn awakening (05:30 to 07:30):** Energy levels reset to 95 or higher for the workday.

---

## 4. Combat tactical systems and enemy AI

### 4.1 Player attack-move formations
In `web/src/combat/TribeTactics.ts:121-186`, `applySmartBattleFormation` arranges selected combat units along orthogonal battle lines:
- Target approach vector $\vec{D} = (\text{target} - \text{center}) / \|\text{target} - \text{center}\|$.
- Perpendicular rank vector $\vec{P} = (-D_y, D_x)$.
- **Frontline:** Melee fighters (clubs, bare hands) deploy abreast at the target line.
- **Rearline:** Ranged units (weapons 1 stone, 2 spear, 5 tomahawk) deploy 2 tiles behind:
  $$\vec{R} = \text{target} - 2\vec{D} + \vec{P} \cdot \text{offset}$$

### 4.2 Enemy AI skirmish coordination
In `web/src/combat/TribeTactics.ts:coordinateEnemyTactics`, Team 1 raiders (IDs 51 to 100) execute coordinated spacing every 1,200 ms:
- Evaluates active marching and attacking units (`UNIT_ORDER === 2 || 3`).
- When a ranged enemy unit approaches within 2.5 tiles of a player unit, the unit steps back 2 tiles along the retreat vector to preserve ranged firing advantage while melee clubmen hold the vanguard line.

### 4.3 Difficulty scaling
Difficulty levels (0 = Easy, 1 = Normal, 2 = Hard) directly control key simulation tables:
- **Raid timer formula:**
  $$aQ = \left(\text{table}_{214}[q] - \text{table}_{215}[q] \times \text{difficulty}\right) \times 100$$
  Hard mode significantly reduces $aQ$, resulting in earlier and more frequent raids.
- **Population ceiling:**
  $$\text{Cap} = \text{packedBytes}[\text{packedOffsets}[275 + \text{difficulty}] + \text{mission}]$$
- **Weapon training qualification:**
  $$w = \text{packedBytes}[\text{packedOffsets}[212 + \text{difficulty}] + q]$$

---

## 5. File references and constants

| Mechanism | Source file | Key symbols and offsets |
| :--- | :--- | :--- |
| Carry capacity | `web/src/sim/world/LegacyRecordAllocator.ts:89` | `UNIT_CARRY_CAPACITY = 3737`, `UNIT_CARRY_AMOUNT = 3636` |
| Resource chaining | `web/src/sim/tribe/SmartHarvesting.ts:24-99` | `SmartHarvestingManager.tick`, `findNearestMatchingResource` |
| Weather effects | `web/src/render/WeatherSystem.ts:113-165` | `applyGameplayEffects`, `BLD_KIND = 8749` (kinds 3, 4, 7, 8, 11) |
| Lighting sources | `web/src/render/DayNightCycle.ts:224-281` | `renderLights`, campfire hub, cooking hearth, torch tower |
| Tactical formations | `web/src/combat/TribeTactics.ts:121-186` | `applySmartBattleFormation`, `coordinateEnemyTactics` |
| Enemy muster | `web/src/sim/tribe/TribeAiMusterRuntime.ts:54-130` | `subsystemTeamOneAiMuster`, `stepLegacySubsystemAt` |
