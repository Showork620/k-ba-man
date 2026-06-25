(function attachRaceHistoryApi(window) {
  const STATIC_DATA = window.KBAMAN_RACE_HISTORY;

  function clone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function assertDataset(dataset) {
    if (!dataset || dataset.schema_version !== "race-history.v1" || !Array.isArray(dataset.races)) {
      throw new Error("race-history.v1 data is not loaded");
    }
  }

  async function loadDataset() {
    assertDataset(STATIC_DATA);
    return clone(STATIC_DATA);
  }

  async function listRaces() {
    const dataset = await loadDataset();
    return dataset.races;
  }

  async function getRace(raceId) {
    const races = await listRaces();
    return races.find((race) => race.race_id === raceId || race.id === raceId) || null;
  }

  async function getCharacterRaceHistory(expertId) {
    const races = await listRaces();
    return races
      .map((race) => ({
        race,
        stats: race.experts.find((expert) => expert.id === expertId || expert.expert_id === expertId),
      }))
      .filter((row) => row.stats);
  }

  async function getRaceExpertPrediction(raceId, expertId) {
    const race = await getRace(raceId);
    if (!race) return null;
    return race.experts.find((expert) => expert.id === expertId || expert.expert_id === expertId) || null;
  }

  async function getRaceBetting(raceId) {
    const race = await getRace(raceId);
    return race?.betting || null;
  }

  async function getRacePayouts(raceId) {
    const race = await getRace(raceId);
    return race?.result?.payout_list || [];
  }

  async function listRaceOutcomes() {
    const races = await listRaces();
    return races.map((race) => ({
      race_id: race.race_id,
      race_name: race.name,
      date: race.date,
      betting: race.betting,
      result: race.result,
      collective: race.collective,
    }));
  }

  window.KBAMAN_RaceHistoryApi = {
    source: "site-static-copy",
    schemaVersion: "race-history.v1",
    loadDataset,
    listRaces,
    getRace,
    getCharacterRaceHistory,
    getRaceExpertPrediction,
    getRaceBetting,
    getRacePayouts,
    listRaceOutcomes,
  };
})(window);
