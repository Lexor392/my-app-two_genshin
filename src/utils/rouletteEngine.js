export const ROULETTE_MODES = ["vertical", "horizontal", "wheel"];
export const ROULETTE_WINNER_INDEX = 52;
export const ROULETTE_SEQUENCE_LENGTH = 72;

export const pickUniqueWinners = (items, count, random = Math.random) => {
  const pool = [...(Array.isArray(items) ? items : [])];
  const safeCount = Math.max(0, Math.min(pool.length, Math.floor(Number(count) || 0)));
  for (let index = 0; index < safeCount; index += 1) {
    const offset = Math.floor(Math.max(0, Math.min(0.999999999, random())) * (pool.length - index));
    const swapIndex = index + offset;
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool.slice(0, safeCount);
};

export const buildRollSequence = (
  items,
  winner,
  winnerIndex = ROULETTE_WINNER_INDEX,
  length = ROULETTE_SEQUENCE_LENGTH,
  random = Math.random
) => {
  const pool = Array.isArray(items) ? items : [];
  const safeLength = Math.max(1, Math.floor(length));
  const safeWinnerIndex = Math.max(0, Math.min(safeLength - 1, Math.floor(winnerIndex)));
  if (!pool.length) return [];
  return Array.from({ length: safeLength }, (_, index) => {
    if (index === safeWinnerIndex) return winner;
    const pickIndex = Math.floor(Math.max(0, Math.min(0.999999999, random())) * pool.length);
    return pool[pickIndex];
  });
};

export const getCenteredReelPosition = (index, viewportSize, cardSize, gap) =>
  viewportSize / 2 - (index * (cardSize + gap) + cardSize / 2);

export const getWheelTargetRotation = (segmentIndex, segmentCount, currentRotation, fullTurns = 6) => {
  if (!segmentCount) return currentRotation;
  const segmentCenter = ((segmentIndex + 0.5) * 360) / segmentCount;
  const targetRemainder = (360 - segmentCenter + 360) % 360;
  const currentRemainder = ((currentRotation % 360) + 360) % 360;
  const alignment = (targetRemainder - currentRemainder + 360) % 360;
  return currentRotation + Math.max(1, fullTurns) * 360 + alignment;
};

export const getRollProgress = (elapsedMs, cruiseDurationMs, rampDurationMs) => {
  const cruise = Math.max(0, Number(cruiseDurationMs) || 0);
  const ramp = Math.max(0, Number(rampDurationMs) || 0);
  const elapsed = Math.max(0, Math.min(cruise + ramp * 2, Number(elapsedMs) || 0));
  if (!ramp) return cruise ? elapsed / cruise : 1;

  const smoothRampIntegral = (time) => time ** 3 - 0.5 * time ** 4;
  const totalDistance = cruise + ramp;
  if (elapsed <= ramp) {
    const progress = elapsed / ramp;
    return (ramp * smoothRampIntegral(progress)) / totalDistance;
  }
  if (elapsed <= ramp + cruise) return (ramp / 2 + elapsed - ramp) / totalDistance;
  const progress = (elapsed - ramp - cruise) / ramp;
  const decelerationDistance = progress - smoothRampIntegral(progress);
  return (ramp / 2 + cruise + ramp * decelerationDistance) / totalDistance;
};
