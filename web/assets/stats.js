// Champions 실효 스탯 계산 (Lv 50 · IV 31 고정)
//
// Stat Points 시스템:
//   첫 SP = 4 EV, 이후 SP = 8 EV 씩 (per stat).
//   so   EV(sp) = 0            if sp == 0
//        EV(sp) = 8*sp - 4      if sp >= 1  (bounds [4, 252])
//
// Gen 3+ 공식 (level 50):
//   HP    = floor( (2*base + 31 + floor(ev/4)) * 50 / 100 ) + 50 + 10
//   기타   = floor( (floor((2*base + 31 + floor(ev/4)) * 50 / 100) + 5) * natureMod )
//
// Nature modifier: +10% / -10% / 1.0. HP 는 절대 영향 없음.

import { natureMultipliers, SP_STAT_KEYS } from "./party-encode.js";

export const LEVEL = 50;
export const IV = 31;

export function spToEv(sp) {
  const n = Math.max(0, Math.min(32, Math.floor(sp || 0)));
  return n === 0 ? 0 : 8 * n - 4;
}

/** HP 공식 (level 50, IV 31) */
function hpStat(base, sp) {
  const ev = spToEv(sp);
  return Math.floor((2 * base + IV + Math.floor(ev / 4)) * LEVEL / 100) + LEVEL + 10;
}

/** Other stats 공식 (level 50, IV 31, nature modifier) */
function otherStat(base, sp, natureMod) {
  const ev = spToEv(sp);
  const core = Math.floor((2 * base + IV + Math.floor(ev / 4)) * LEVEL / 100) + 5;
  return Math.floor(core * natureMod);
}

/**
 * @param {{hp:number, atk:number, def:number, spAtk:number, spDef:number, speed:number}} baseStats
 * @param {number[]} sps  length 6 (hp/atk/def/spAtk/spDef/speed)
 * @param {string|null} natureSlug
 * @param {{slug:string, increased:string|null, decreased:string|null}[]} natures  natures.json
 * @returns {{hp:number, atk:number, def:number, spAtk:number, spDef:number, speed:number}}
 */
export function effectiveStats(baseStats, sps, natureSlug, natures) {
  const mods = natureMultipliers(natureSlug, natures);
  const arr = Array.isArray(sps) && sps.length === 6 ? sps : [0, 0, 0, 0, 0, 0];
  const [hpSp, atkSp, defSp, spASp, spDSp, speSp] = arr;
  return {
    hp:    hpStat(baseStats.hp ?? 0, hpSp),
    atk:   otherStat(baseStats.atk ?? 0, atkSp, mods.atk),
    def:   otherStat(baseStats.def ?? 0, defSp, mods.def),
    spAtk: otherStat(baseStats.spAtk ?? 0, spASp, mods.spAtk),
    spDef: otherStat(baseStats.spDef ?? 0, spDSp, mods.spDef),
    speed: otherStat(baseStats.speed ?? 0, speSp, mods.speed),
  };
}

export function effectiveStatsTotal(stats) {
  return SP_STAT_KEYS.reduce((acc, k) => acc + (stats[k] ?? 0), 0);
}
