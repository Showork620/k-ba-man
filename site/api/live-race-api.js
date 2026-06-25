(function attachLiveRaceApi(window) {
  const STATIC_DATA = window.KBAMAN_LIVE_RACE;

  function clone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function assertDataset(dataset) {
    if (!dataset || dataset.schema_version !== "live-race.v1" || !Array.isArray(dataset.phases)) {
      throw new Error("live-race.v1 data is not loaded");
    }
  }

  async function loadDataset() {
    assertDataset(STATIC_DATA);
    return clone(STATIC_DATA);
  }

  async function getActivePhase() {
    const dataset = await loadDataset();
    return dataset.phases.find((phase) => phase.id === dataset.active_phase) || dataset.phases[0] || null;
  }

  async function getPhase(phaseId) {
    const dataset = await loadDataset();
    return dataset.phases.find((phase) => phase.id === phaseId || phase.route === phaseId) || null;
  }

  window.KBAMAN_LiveRaceApi = {
    source: "site-static-control",
    schemaVersion: "live-race.v1",
    loadDataset,
    getActivePhase,
    getPhase,
  };
})(window);
