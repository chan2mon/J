// Config
const CSV_PATH = "data.csv"; // change if CSV is at different path
let dictionary = []; // loaded entries

// Load CSV at startup using PapaParse
document.addEventListener("DOMContentLoaded", () => {
  const results = document.getElementById("results");
  const input = document.getElementById("searchInput");
  const btn = document.getElementById("searchBtn");

  // Fetch CSV as text then parse
  fetch(CSV_PATH)
    .then(r => {
      if (!r.ok) throw new Error("Could not load CSV: " + r.status);
      return r.text();
    })
    .then(csvText => {
      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      dictionary = parsed.data.map(row => ({
        word: (row.word || "").trim(),
        pos: (row.pos || "").trim(),
        definition: (row.definition || "").trim()
      }));
      // optional: sort alphabetically
      dictionary.sort((a,b)=>a.word.localeCompare(b.word));
    })
    .catch(err => {
      results.innerHTML = `<p class="hint">Error loading CSV: ${err.message}</p>`;
    });

  // search function: exact + startsWith + simple fuzzy
  function searchQuery(q) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    // exact matches first
    const exact = dictionary.filter(e => e.word.toLowerCase() === q);
    if (exact.length) return exact;
    // startswith
    const starts = dictionary.filter(e => e.word.toLowerCase().startsWith(q));
    if (starts.length) return starts;
    // contains and simple Levenshtein-ish by length diff (cheap)
    const contains = dictionary.filter(e => e.word.toLowerCase().includes(q));
    if (contains.length) return contains;
    // fallback: return 5 closest by small string distance (simple)
    const scored = dictionary.map(e => ({e, score: Math.abs(e.word.length - q.length) + (e.word.toLowerCase().includes(q) ? 0 : 5)}));
    scored.sort((a,b)=>a.score-b.score);
    return scored.slice(0,5).map(s=>s.e);
  }

  function renderResults(list, query) {
    if (!list || list.length===0) {
      results.innerHTML = `<p class="hint">No results for "<strong>${escapeHtml(query)}</strong>"</p>`;
      return;
    }
    results.innerHTML = list.map(item => `
      <div class="item">
        <div><span class="word">${escapeHtml(item.word)}</span>
        ${item.pos ? `<span class="pos">(${escapeHtml(item.pos)})</span>` : ''}</div>
        <div class="def">${escapeHtml(item.definition)}</div>
      </div>
    `).join("");
  }

  // escape helper
  function escapeHtml(s){ return (s||"").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // event handlers
  btn.addEventListener("click", ()=>{
    const q = input.value;
    const res = searchQuery(q);
    renderResults(res, q);
  });

  input.addEventListener("keydown", e=>{
    if (e.key === "Enter") {
      e.preventDefault();
      btn.click();
    }
  });

  // (optional) show suggestions as you type: small improvement
  input.addEventListener("input", ()=>{
    const q = input.value.trim().toLowerCase();
    if (!q) {
      results.innerHTML = `<p class="hint">Search for a word above — results will appear here.</p>`;
      return;
    }
    // show up to 6 suggestions (startsWith)
    const sug = dictionary.filter(e => e.word.toLowerCase().startsWith(q)).slice(0,6);
    if (sug.length) {
      results.innerHTML = sug.map(item=>`<div class="item"><div class="word">${escapeHtml(item.word)}</div><div class="pos">${escapeHtml(item.pos)}</div></div>`).join("");
    }
  });

});
