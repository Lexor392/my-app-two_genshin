import { describe, expect, it } from "vitest";
import {
  buildRollSequence,
  getCenteredReelPosition,
  getSequentialLaneDelay,
  getRollProgress,
  getWheelTargetRotation,
  pickUniqueWinners,
  ROULETTE_SEQUENCE_LENGTH,
  ROULETTE_TRAVEL_CARDS,
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

  it("starts reel lanes one at a time and gives each reel a long card run", () => {
    const laneDuration = 3000 + 5000 + 5000;
    expect(getSequentialLaneDelay(0, 3000, 5000, 5000)).toBe(0);
    expect(getSequentialLaneDelay(1, 3000, 5000, 5000)).toBe(laneDuration);
    expect(getSequentialLaneDelay(3, 3000, 5000, 5000)).toBe(laneDuration * 3);
    expect(ROULETTE_WINNER_INDEX - ROULETTE_TRAVEL_CARDS).toBe(12);
    expect(ROULETTE_WINNER_INDEX).toBeLessThan(ROULETTE_SEQUENCE_LENGTH);
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

  it("uses a three-second acceleration, selected cruise duration, and five-second braking ramp", () => {
    const cruise = 5000;
    const acceleration = 3000;
    const deceleration = 5000;
    const totalDuration = acceleration + cruise + deceleration;
    expect(getRollProgress(0, cruise, acceleration, deceleration)).toBe(0);
    expect(getRollProgress(totalDuration, cruise, acceleration, deceleration)).toBeCloseTo(1, 8);
    expect(getRollProgress(100, cruise, acceleration, deceleration)).toBeLessThan(100 / totalDuration);
    expect(getRollProgress(totalDuration - 100, cruise, acceleration, deceleration)).toBeGreaterThan(1 - 100 / totalDuration);
    expect(getRollProgress(acceleration, cruise, acceleration, deceleration)).toBeCloseTo(acceleration / 2 / (cruise + (acceleration + deceleration) / 2), 8);
    expect(getRollProgress(acceleration + cruise, cruise, acceleration, deceleration)).toBeCloseTo((acceleration / 2 + cruise) / (cruise + (acceleration + deceleration) / 2), 8);
  });
});
