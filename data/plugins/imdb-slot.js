let apiKey = "";

function esc(s) {
  if (typeof s !== "string") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function searchTermFromQuery(query) {
  const q = query.trim();
  const castMatch = q.match(/^(.+?)\s+cast\s*$/i) || q.match(/\s+cast\s*$/i);
  if (castMatch) return (castMatch[1] || q.replace(/\s+cast\s*$/i, "")).trim();
  return q;
}

export const slot = {
  id: "imdb",
  name: "IMDb",
  position: "above-results",

  settingsSchema: [
    {
      key: "apiKey",
      label: "OMDb API Key",
      type: "password",
      required: true,
      secret: true,
      placeholder: "Get a free key at omdbapi.com",
      description: "Required for cast and movie data. Free at https://www.omdbapi.com/apikey.aspx",
    },
  ],

  configure(settings) {
    const raw = (settings && settings.apiKey) || "";
    apiKey = typeof raw === "string" ? raw.trim() : "";
  },

  trigger(query) {
    const q = query.trim();
    if (!q || q.length < 2 || q.length > 80) return false;
    const words = q.split(/\s+/).filter(Boolean);
    return words.length >= 1 && words.length <= 5;
  },

  async execute(query) {
    if (!apiKey) return { title: "", html: "" };

    const term = searchTermFromQuery(query);
    if (!term) return { title: "", html: "" };

    try {
      let data = await fetch(
        `https://www.omdbapi.com/?apikey=${encodeURIComponent(apiKey)}&t=${encodeURIComponent(term)}&r=json`
      ).then((r) => r.json());

      if (!data || data.Response === "False") {
        const searchRes = await fetch(
          `https://www.omdbapi.com/?apikey=${encodeURIComponent(apiKey)}&s=${encodeURIComponent(term)}&r=json`
        ).then((r) => r.json());
        if (searchRes.Response === "True" && searchRes.Search && searchRes.Search.length > 0) {
          const first = searchRes.Search[0];
          data = await fetch(
            `https://www.omdbapi.com/?apikey=${encodeURIComponent(apiKey)}&i=${encodeURIComponent(first.imdbID)}&r=json`
          ).then((r) => r.json());
        }
      }

      if (!data || data.Response !== "True") return { title: "", html: "" };

      const title = data.Title || "";
      const year = data.Year || "";
      const genre = data.Genre || "";
      const runtime = data.Runtime || "";
      const plot = (data.Plot || "").slice(0, 280);
      const poster = data.Poster && data.Poster !== "N/A" ? data.Poster : null;
      const actors = (data.Actors || "").split(",").map((a) => a.trim()).filter(Boolean);
      const director = data.Director || "";
      const imdbId = data.imdbID || "";
      const imdbUrl = imdbId ? `https://www.imdb.com/title/${imdbId}/` : "";
      const typeLabel = (data.Type || "").toLowerCase() === "series" ? "TV Series" : "Movie";

      let castHtml = "";
      if (actors.length > 0) {
        castHtml = `<div style="margin-top:10px"><div style="font-weight:600;margin-bottom:4px">Cast</div><div style="color:var(--text-primary);line-height:1.5">${actors.map((a) => esc(a)).join(", ")}</div></div>`;
      }

      const metaParts = [typeLabel];
      if (year) metaParts.push(year);
      if (runtime) metaParts.push(runtime);
      if (genre) metaParts.push(genre);
      const metaLine = metaParts.filter(Boolean).join(" · ");

      const posterBlock = poster
        ? `<div style="flex-shrink:0;width:120px;height:180px;border-radius:8px;overflow:hidden;background:var(--bg-light,#f0f0f0)"><img src="${esc(poster)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.style.display='none'"></div>`
        : "";

      const html = `
        <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap">
          ${posterBlock}
          <div style="flex:1;min-width:0">
            <div style="font-size:0.85em;color:var(--text-secondary);margin-bottom:4px">${esc(metaLine)}</div>
            <h3 style="margin:0 0 8px;font-size:1.15em;font-weight:600;color:var(--text-primary)">${esc(title)}</h3>
            ${plot ? `<p style="margin:0 0 8px;font-size:0.9em;line-height:1.5;color:var(--text-primary)">${esc(plot)}${plot.length >= 280 ? "…" : ""}</p>` : ""}
            ${director ? `<div style="font-size:0.9em;margin-bottom:4px"><span style="font-weight:600">Director</span> ${esc(director)}</div>` : ""}
            ${castHtml}
            ${imdbUrl ? `<a href="${esc(imdbUrl)}" target="_blank" rel="noopener" style="display:inline-block;margin-top:10px;font-size:0.9em">View on IMDb</a>` : ""}
          </div>
        </div>`;

      return { title: "IMDb", html };
    } catch {
      return { title: "", html: "" };
    }
  },
};

export default { slot };
