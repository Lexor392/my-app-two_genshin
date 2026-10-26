export const ROULETTE_MODES = ["vertical", "horizontal", "wheel"];
export const ROULETTE_WINNER_INDEX = 112;
export const ROULETTE_SEQUENCE_LENGTH = 160;
export const ROULETTE_TRAVEL_CARDS = 40;

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

export const getSequentialLaneDelay = (laneIndex, accelerationDurationMs, cruiseDurationMs, decelerationDurationMs) =>
  Math.max(0, Math.floor(Number(laneIndex) || 0)) * (
    Math.max(0, Number(accelerationDurationMs) || 0)
    + Math.max(0, Number(cruiseDurationMs) || 0)
    + Math.max(0, Number(decelerationDurationMs) || 0)
  );

export const getRollDistanceRatio = (cruiseDurationMs, accelerationDurationMs, decelerationDurationMs, baseCruiseDurationMs = 5000) => {
  const acceleration = Math.max(0, Number(accelerationDurationMs) || 0);
  const deceleration = Math.max(0, Number(decelerationDurationMs) || 0);
  const cruise = Math.max(0, Number(cruiseDurationMs) || 0);
  const baseCruise = Math.max(0, Number(baseCruiseDurationMs) || 0);
  const baseDistance = baseCruise + (acceleration + deceleration) / 2;
  return baseDistance ? (cruise + (acceleration + deceleration) / 2) / baseDistance : 1;
};

export const getRollTravelCardCount = (cruiseDurationMs, accelerationDurationMs, decelerationDurationMs, baseCardCount = ROULETTE_TRAVEL_CARDS) =>
  Math.max(1, Math.round(baseCardCount * getRollDistanceRatio(cruiseDurationMs, accelerationDurationMs, decelerationDurationMs)));

export const getWheelTargetRotation = (segmentIndex, segmentCount, currentRotation, fullTurns = 6) => {
  if (!segmentCount) return currentRotation;
  const segmentCenter = ((segmentIndex + 0.5) * 360) / segmentCount;
  const targetRemainder = (360 - segmentCenter + 360) % 360;
  const currentRemainder = ((currentRotation % 360) + 360) % 360;
  const alignment = (targetRemainder - currentRemainder + 360) % 360;
  return currentRotation + Math.max(1, fullTurns) * 360 + alignment;
};

export const getRollProgress = (elapsedMs, cruiseDurationMs, accelerationDurationMs, decelerationDurationMs) => {
  const cruise = Math.max(0, Number(cruiseDurationMs) || 0);
  const acceleration = Math.max(0, Number(accelerationDurationMs) || 0);
  const deceleration = Math.max(0, Number(decelerationDurationMs) || 0);
  const elapsed = Math.max(0, Math.min(acceleration + cruise + deceleration, Number(elapsedMs) || 0));
  if (!acceleration && !deceleration) return cruise ? elapsed / cruise : 1;

  const smoothRampIntegral = (time) => time ** 3 - 0.5 * time ** 4;
  const totalDistance = cruise + acceleration / 2 + deceleration / 2;
  if (acceleration && elapsed <= acceleration) {
    const progress = elapsed / acceleration;
    return (acceleration * smoothRampIntegral(progress)) / totalDistance;
  }
  if (elapsed <= acceleration + cruise) return (acceleration / 2 + elapsed - acceleration) / totalDistance;
  if (!deceleration) return 1;
  const progress = (elapsed - acceleration - cruise) / deceleration;
  const decelerationDistance = progress - smoothRampIntegral(progress);
  return (acceleration / 2 + cruise + deceleration * decelerationDistance) / totalDistance;
};
