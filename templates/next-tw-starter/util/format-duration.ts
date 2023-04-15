export function formatDuration(duration: number) {
  const h = Math.floor(duration / 3600);
  const m = Math.floor((duration % 3600) / 60);
  const s = Math.round(duration % 60);
  return [h, m > 9 ? m : h ? "0" + m : m || "0", s > 9 ? s : "0" + s]
    .filter(Boolean)
    .join(":");
}
