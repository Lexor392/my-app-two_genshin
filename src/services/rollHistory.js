export const createRollHistoryEntries = (stage, results, timestamp = new Date().toISOString()) => {
  const winners = (Array.isArray(results) ? results : [results]).filter((item) => item?.id);
  if (!winners.length || !["characters", "bosses"].includes(stage)) return [];

  const rollId = `${stage}-${Date.parse(timestamp)}-${Math.random().toString(36).slice(2, 8)}`;
  return winners.map((winner, index) => ({
    id: `${rollId}-${index}-${winner.id}`,
    rollId,
    stage,
    itemId: String(winner.id),
    itemName: winner.name || String(winner.id),
    itemNameRu: winner.nameRu || winner.name || String(winner.id),
    rarity: winner.rarity === 4 || winner.rarity === 5 ? winner.rarity : null,
    group: winner.group || "",
    timestamp,
  }));
};

export const countRollSessions = (entries, predicate = () => true) => {
  const sessionIds = new Set();
  for (const entry of entries || []) {
    if (!predicate(entry)) continue;
    sessionIds.add(entry.rollId || entry.id);
  }
  return sessionIds.size;
};
