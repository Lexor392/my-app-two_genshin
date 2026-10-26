import { describe, expect, it } from "vitest";
import {
  buildRollSequence,
  getCenteredReelPosition,
  getRollProgress,
  getWheelTargetRotation,
  pickUniqueWinners,
  ROULETTE_SEQUENCE_LENGTH,
  ROULETTE_WINNER_INDEX,
} from "./rouletteEngine";

const makeRandom = (value) => () => value;

describe("roulette engine math", () => {
  it("chooses distinct winners only from the active pool", () => {
    const pool = Array.from({ length: 12 }, (_, id) => ({ id }));
    const winners = pickUniqueWinners(pool, 4, makeRandom(0.55));
    expect(winners).toHaveLength(4);
    expect(new Set(winners.map((item) => item.id)).size).toBe(4);
    expect(winners.every((winner) => pool.includes(winner))).toBe(true);
  });

  it("places the selected character at the exact stop index in a fresh full-pool reel", () => {
    const pool = Array.from({ length: 131 }, (_, id) => ({ id }));
    const winner = pool[127];
    const sequence = buildRollSequence(pool, winner, ROULETTE_WINNER_INDEX, ROULETTE_SEQUENCE_LENGTH, makeRandom(0.4));
    expect(sequence).toHaveLength(ROULETTE_SEQUENCE_LENGTH);
    expect(sequence[ROULETTE_WINNER_INDEX]).toBe(winner);
    expect(sequence.every((item) => pool.includes(item))).toBe(true);
  });

  it("moves the reel track downward toward a lower index", () => {
    const start = getCenteredReelPosition(62, 420, 200, 12);
    const stop = getCenteredReelPosition(52, 420, 200, 12);
    expect(stop).toBeGreaterThan(start);
  });

  it("stops the wheel on the chosen wedge after multiple forward turns", () => {
    const totalSegments = 131;
    const chosenSegment = 108;
    const start = 721.5;
    const end = getWheelTargetRotation(chosenSegment, totalSegments, start, 6);
    const targetRemainder = (360 - ((chosenSegment + 0.5) * 360) / totalSegments + 360) % 360;
    expect(end).toBeGreaterThan(start);
    expect(end % 360).toBeCloseTo(targetRemainder, 8);
  });

  it("uses long, synchronized acceleration and braking ramps around the selected roll duration", () => {
    const cruise = 5000;
    const ramp = 1400;
    expect(getRollProgress(0, cruise, ramp)).toBe(0);
    expect(getRollProgress(cruise + ramp * 2, cruise, ramp)).toBeCloseTo(1, 8);
    expect(getRollProgress(100, cruise, ramp)).toBeLessThan(100 / (cruise + ramp * 2));
    expect(getRollProgress(cruise + ramp * 2 - 100, cruise, ramp)).toBeGreaterThan(1 - 100 / (cruise + ramp * 2));
    expect(getRollProgress(ramp, cruise, ramp)).toBeCloseTo(ramp / 2 / (cruise + ramp), 8);
  });
});
