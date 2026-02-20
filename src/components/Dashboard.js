import React, { useMemo } from 'react';

const WETTER_ICONS = { Sonne: '\u2600\uFE0F', 'Bewölkt': '\u2601\uFE0F', Regen: '\uD83C\uDF27\uFE0F', Schnee: '\u2744\uFE0F' };

const WILDART_KEYWORDS = [
  { label: 'Rehwild', patterns: ['reh', 'bock', 'geiß', 'geiss', 'schmalreh', 'schmaltier', 'kitz', 'ricke'] },
  { label: 'Schwarzwild', patterns: ['sau', 'keiler', 'bache', 'frischling', 'überläufer', 'schwarzwild'] },
  { label: 'Rotwild', patterns: ['hirsch', 'rotwild', 'alttier', 'kalb', 'spießer', 'schmaltier'] },
  { label: 'Damwild', patterns: ['damwild', 'damhirsch'] },
  { label: 'Fuchs', patterns: ['fuchs', 'fähe', 'rüde'] },
  { label: 'Hase', patterns: ['hase', 'häsin'] },
  { label: 'Taube', patterns: ['taube', 'ringeltaube'] },
  { label: 'Ente', patterns: ['ente', 'stockente'] },
  { label: 'Gans', patterns: ['gans', 'graugans', 'kanadagans'] },
  { label: 'Dachs', patterns: ['dachs'] },
  { label: 'Marder', patterns: ['marder', 'steinmarder'] },
  { label: 'Waschbär', patterns: ['waschbär', 'waschbaer'] },
];

function analyzeWildarten(entries) {
  const counts = {};
  entries.forEach(entry => {
    if (!entry.wildartDetails) return;
    const text = entry.wildartDetails.toLowerCase();
    WILDART_KEYWORDS.forEach(({ label, patterns }) => {
      if (patterns.some(p => text.includes(p))) {
        counts[label] = (counts[label] || 0) + 1;
      }
    });
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

export default function Dashboard({ entries }) {
  const stats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearEntries = entries.filter(e => e.datum && e.datum.startsWith(String(currentYear)));

    const totalAnsitze = yearEntries.length;
    const totalSchuss = yearEntries.filter(e => e.schuss).length;
    const totalStrecke = yearEntries.filter(e => e.strecke).reduce((s, e) => s + (parseInt(e.streckeAnzahl) || 1), 0);

    // Wildlife keyword analysis
    const wildSorted = analyzeWildarten(yearEntries);
    const maxWild = wildSorted.length > 0 ? wildSorted[0][1] : 1;

    // Location counts (count ansitze per ort)
    const ortCounts = {};
    yearEntries.forEach(e => {
      ortCounts[e.ort] = (ortCounts[e.ort] || 0) + 1;
    });
    const ortSorted = Object.entries(ortCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxOrt = ortSorted.length > 0 ? ortSorted[0][1] : 1;

    // Time distribution
    let morgen = 0, abend = 0, andere = 0;
    yearEntries.forEach(e => {
      if (!e.zeitVon) { andere++; return; }
      const h = parseInt(e.zeitVon.split(':')[0]);
      if (h >= 4 && h < 11) morgen++;
      else if (h >= 15 && h < 22) abend++;
      else andere++;
    });

    // Hourly distribution for clock chart
    const hourCounts = {};
    yearEntries.forEach(e => {
      if (!e.zeitVon) return;
      const h = parseInt(e.zeitVon.split(':')[0]);
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    });
    const maxHour = Math.max(...Object.values(hourCounts), 1);

    // Weather correlation (count ansitze per weather)
    const weatherAnsitze = {};
    yearEntries.forEach(e => {
      if (!e.wetter) return;
      weatherAnsitze[e.wetter] = (weatherAnsitze[e.wetter] || 0) + 1;
    });
    const weatherCorr = Object.keys(weatherAnsitze).map(w => ({
      name: w,
      icon: WETTER_ICONS[w] || '',
      ansitze: weatherAnsitze[w],
    })).sort((a, b) => b.ansitze - a.ansitze);

    return { totalAnsitze, totalSchuss, totalStrecke, wildSorted, maxWild, ortSorted, maxOrt, morgen, abend, andere, currentYear, hourCounts, maxHour, weatherCorr };
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div className="empty-icon">{'\uD83D\uDCCA'}</div>
          <div>Noch keine Daten für Statistiken.</div>
          <div style={{ fontSize: '0.82rem', marginTop: 4 }}>Erstelle deinen ersten Ansitz-Eintrag!</div>
        </div>
      </div>
    );
  }

  // Relevant hours: 4-22
  const hours = [];
  for (let h = 4; h <= 22; h++) hours.push(h);

  return (
    <div className="page-content">
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.totalAnsitze}</div>
          <div className="stat-label">Ansitze {stats.currentYear}</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.totalSchuss}</div>
          <div className="stat-label">Schüsse</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.totalStrecke}</div>
          <div className="stat-label">Strecke (Stk.)</div>
        </div>
      </div>

      {stats.wildSorted.length > 0 && (
        <div className="chart-section">
          <h3>Erwähnte Wildarten</h3>
          <div className="bar-chart">
            {stats.wildSorted.map(([name, count]) => (
              <div className="bar-row" key={name}>
                <span className="bar-label">{name}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(count / stats.maxWild) * 100}%` }}>
                    {count}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <small className="field-hint" style={{ marginTop: 8 }}>Basierend auf Keyword-Erkennung im Freitext</small>
        </div>
      )}

      <div className="chart-section">
        <h3>Beste Reviere</h3>
        <div className="bar-chart">
          {stats.ortSorted.map(([name, count]) => (
            <div className="bar-row" key={name}>
              <span className="bar-label">{name}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(count / stats.maxOrt) * 100}%` }}>
                  {count}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="chart-section">
        <h3>Ansitzzeiten</h3>
        <div className="time-dist">
          <div className="time-block">
            <div className="time-icon">{'\uD83C\uDF05'}</div>
            <div className="time-count">{stats.morgen}</div>
            <div className="time-label">Morgen</div>
          </div>
          <div className="time-block">
            <div className="time-icon">{'\uD83C\uDF07'}</div>
            <div className="time-count">{stats.abend}</div>
            <div className="time-label">Abend</div>
          </div>
          <div className="time-block">
            <div className="time-icon">{'\uD83C\uDF19'}</div>
            <div className="time-count">{stats.andere}</div>
            <div className="time-label">Sonstige</div>
          </div>
        </div>
      </div>

      <div className="chart-section">
        <h3>Ansitze nach Uhrzeit</h3>
        <div className="hour-grid">
          {hours.map(h => {
            const count = stats.hourCounts[h] || 0;
            const intensity = count > 0 ? Math.max(0.15, count / stats.maxHour) : 0;
            return (
              <div key={h} className="hour-cell" style={count > 0 ? { background: `rgba(74,124,40,${intensity})`, color: intensity > 0.5 ? 'white' : 'var(--text-primary)' } : {}}>
                <span className="hour-label">{String(h).padStart(2, '0')}:00</span>
                <span className="hour-count">{count > 0 ? count : '-'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {stats.weatherCorr.length > 0 && (
        <div className="chart-section">
          <h3>Ansitze nach Wetter</h3>
          <div className="weather-stats">
            {stats.weatherCorr.map(w => (
              <div key={w.name} className="weather-stat-row">
                <span className="ws-icon">{w.icon}</span>
                <span className="ws-label">{w.name}</span>
                <span className="ws-pct">{w.ansitze}x</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
