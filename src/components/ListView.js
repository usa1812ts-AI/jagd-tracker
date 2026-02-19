import React, { useState, useMemo } from 'react';

const WILDARTEN = ['Rehwild', 'Schwarzwild', 'Rotwild', 'Damwild', 'Fuchs', 'Hase', 'Sonstiges'];

function formatDate(d) {
  if (!d) return '';
  const parts = d.split('-');
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return d;
}

export default function ListView({ entries, orte, onDelete, onEdit }) {
  const [filterOrt, setFilterOrt] = useState('');
  const [filterWild, setFilterWild] = useState('');
  const [filterZeitraum, setFilterZeitraum] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);

  const filtered = useMemo(() => {
    let result = [...entries].sort((a, b) => {
      const da = a.datum + (a.zeitVon || '');
      const db = b.datum + (b.zeitVon || '');
      return db.localeCompare(da);
    });

    if (filterOrt) result = result.filter(e => e.ort === filterOrt);
    if (filterWild) result = result.filter(e => e.wildart === filterWild);
    if (filterZeitraum) {
      const now = new Date();
      let cutoff;
      if (filterZeitraum === '7') cutoff = new Date(now - 7 * 86400000);
      else if (filterZeitraum === '30') cutoff = new Date(now - 30 * 86400000);
      else if (filterZeitraum === '90') cutoff = new Date(now - 90 * 86400000);
      else if (filterZeitraum === '365') cutoff = new Date(now - 365 * 86400000);
      if (cutoff) result = result.filter(e => new Date(e.datum) >= cutoff);
    }

    return result;
  }, [entries, filterOrt, filterWild, filterZeitraum]);

  const handleDelete = (id) => {
    if (window.confirm('Eintrag wirklich löschen?')) {
      onDelete(id);
      setSelectedEntry(null);
    }
  };

  const handleEdit = (entry) => {
    onEdit(entry);
    setSelectedEntry(null);
  };

  return (
    <div className="page-content">
      <div className="filter-bar">
        <select value={filterOrt} onChange={e => setFilterOrt(e.target.value)}>
          <option value="">Alle Orte</option>
          {orte.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <select value={filterWild} onChange={e => setFilterWild(e.target.value)}>
          <option value="">Alle Wildarten</option>
          {WILDARTEN.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
        <select value={filterZeitraum} onChange={e => setFilterZeitraum(e.target.value)}>
          <option value="">Zeitraum</option>
          <option value="7">Letzte 7 Tage</option>
          <option value="30">Letzte 30 Tage</option>
          <option value="90">Letzte 90 Tage</option>
          <option value="365">Letztes Jahr</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{'\uD83E\uDD8C'}</div>
          <div>Noch keine Einträge vorhanden.</div>
        </div>
      ) : (
        filtered.map(entry => (
          <div key={entry.id} className="entry-card" onClick={() => setSelectedEntry(entry)}>
            <div className="card-header">
              <span className="card-date">{formatDate(entry.datum)} {entry.zeitVon && `${entry.zeitVon}`}{entry.zeitBis && `-${entry.zeitBis}`}</span>
              <span className="card-location">{entry.ort}</span>
            </div>
            <div className="card-body">
              <span className="card-wildlife">{entry.wildart}</span>
              <span className="card-count">{entry.anzahl}x {entry.details || ''}</span>
            </div>
            <div className="card-badges">
              {entry.schuss && <span className="badge badge-shot">Schuss</span>}
              {entry.strecke && <span className="badge badge-strecke">Strecke</span>}
              {entry.wetter && <span className="badge badge-weather">{entry.wetter}</span>}
              {entry.gps && <span className="badge badge-gps">{'\uD83D\uDCCD'} GPS</span>}
            </div>
          </div>
        ))
      )}

      {selectedEntry && (
        <div className="modal-overlay" onClick={() => setSelectedEntry(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{selectedEntry.wildart} - {formatDate(selectedEntry.datum)}</h2>
            <div className="detail-row"><span className="label">Datum</span><span>{formatDate(selectedEntry.datum)}</span></div>
            <div className="detail-row"><span className="label">Ort</span><span>{selectedEntry.ort}</span></div>
            <div className="detail-row"><span className="label">Zeit</span><span>{selectedEntry.zeitVon || '-'}{selectedEntry.zeitBis ? ` - ${selectedEntry.zeitBis}` : ''}</span></div>
            <div className="detail-row"><span className="label">Wildart</span><span>{selectedEntry.wildart}</span></div>
            <div className="detail-row"><span className="label">Anzahl</span><span>{selectedEntry.anzahl}</span></div>
            {selectedEntry.details && <div className="detail-row"><span className="label">Details</span><span>{selectedEntry.details}</span></div>}
            <div className="detail-row"><span className="label">Schuss</span><span>{selectedEntry.schuss ? 'Ja' : 'Nein'}</span></div>
            {selectedEntry.schuss && selectedEntry.waffe && <div className="detail-row"><span className="label">Waffe</span><span>{selectedEntry.waffe}</span></div>}
            {selectedEntry.schuss && <div className="detail-row"><span className="label">Strecke</span><span>{selectedEntry.strecke ? 'Ja' : 'Nein'}</span></div>}
            {selectedEntry.wetter && <div className="detail-row"><span className="label">Wetter</span><span>{selectedEntry.wetter}</span></div>}
            {selectedEntry.wind && <div className="detail-row"><span className="label">Wind</span><span>{selectedEntry.wind}</span></div>}
            {selectedEntry.gps && <div className="detail-row"><span className="label">GPS</span><span>{selectedEntry.gps.lat}, {selectedEntry.gps.lng}</span></div>}
            {selectedEntry.sonnenaufgang && <div className="detail-row"><span className="label">Sonnenaufgang</span><span>{selectedEntry.sonnenaufgang}</span></div>}
            {selectedEntry.sonnenuntergang && <div className="detail-row"><span className="label">Sonnenuntergang</span><span>{selectedEntry.sonnenuntergang}</span></div>}
            {selectedEntry.begleitung && <div className="detail-row"><span className="label">Begleitung</span><span>{selectedEntry.begleitung}</span></div>}
            {selectedEntry.notizen && <div className="detail-row"><span className="label">Notizen</span><span>{selectedEntry.notizen}</span></div>}
            <div className="modal-actions">
              <button className="btn-close-modal" onClick={() => setSelectedEntry(null)}>Schließen</button>
              <button className="btn-edit" onClick={() => handleEdit(selectedEntry)}>Bearbeiten</button>
              <button className="btn-delete" onClick={() => handleDelete(selectedEntry.id)}>Löschen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
