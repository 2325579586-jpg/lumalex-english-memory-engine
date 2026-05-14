export async function getSettingsSnapshot() {
  return {
    dailyGoal: 30,
    sessionSize: 10,
    autoPronunciation: true,
    interfaceMode: "dark",
  };
}
