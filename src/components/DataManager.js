import React, { useRef, useMemo } from 'react';

const CSV_HEADER = 'Datum;Ort;GPS_Latitude;GPS_Longitude;Uhrzeit_Von;Uhrzeit_Bis;Wildarten_Details;Schuss;Waffe;Waffentyp;Strecke;Strecke_Anzahl;Strecke_Wildart;Strecke_Details;Wetter;Windrichtung;Begleitung;Notizen;Sonnenaufgang;Sonnenuntergang';

function escapeCSV(val) {
  const s = String(val).replace(/"/g, '""');
  return `"${s}"`;
}

function entriesToCSV(entries) {
  const rows = entries.map(e => [
    e.datum || '',
    e.ort || '',
    e.gps ? e.gps.lat : '',
    e.gps ? e.gps.lng : '',
    e.zeitVon || '',
    e.zeitBis || '',
    (e.wildartDetails || '').replace(/\n/g, ' | '),
    e.schuss ? 'Ja' : 'Nein',
    e.waffe || '',
    e.waffentyp || '',
    e.strecke ? 'Ja' : 'Nein',
    e.streckeAnzahl || '',
    e.streckeWildart || '',
    (e.streckeDetails || '').replace(/\n/g, ' '),
    e.wetter || '',
    e.wind || '',
    e.begleitung || '',
    (e.notizen || '').replace(/\n/g, ' '),
    e.sonnenaufgang || '',
    e.sonnenuntergang || '',
  ].map(escapeCSV).join(';'));
  return [CSV_HEADER, ...rows].join('\n');
}

function csvToEntries(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const entries = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = line.split(';').map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
    if (cols.length < 8) continue;
    const lat = parseFloat(cols[2]);
    const lng = parseFloat(cols[3]);
    entries.push({
      id: Date.now().toString() + i,
      datum: cols[0] || '',
      ort: cols[1] || '',
      gps: (!isNaN(lat) && !isNaN(lng) && cols[2]) ? { lat, lng } : null,
      zeitVon: cols[4] || '',
      zeitBis: cols[5] || '',
      wildartDetails: (cols[6] || '').replace(/ \| /g, '\n'),
      schuss: (cols[7] || '').toLowerCase() === 'ja',
      waffe: cols[8] || '',
      waffentyp: cols[9] || '',
      strecke: (cols[10] || '').toLowerCase() === 'ja',
      streckeAnzahl: parseInt(cols[11]) || '',
      streckeWildart: cols[12] || '',
      streckeDetails: cols[13] || '',
      wetter: cols[14] || '',
      wind: cols[15] || '',
      begleitung: cols[16] || '',
      notizen: cols[17] || '',
      sonnenaufgang: cols[18] || '',
      sonnenuntergang: cols[19] || '',
    });
  }
  return entries;
}

export default function DataManager({ entries, onImport, onClearAll, showToast, darkMode, onToggleDark }) {
  const fileRef = useRef(null);
  const jsonRef = useRef(null);

  const dataInfo = useMemo(() => {
    if (entries.length === 0) return null;
    const sorted = [...entries].sort((a, b) => (a.datum || '').localeCompare(b.datum || ''));
    const oldest = sorted[0]?.datum;
    const newest = sorted[sorted.length - 1]?.datum;
    const formatD = (d) => {
      if (!d) return '-';
      const p = d.split('-');
      return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : d;
    };
    return { oldest: formatD(oldest), newest: formatD(newest) };
  }, [entries]);

  const handleExport = () => {
    const csv = entriesToCSV(entries);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jagd-tracker-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`${entries.length} Einträge als CSV exportiert!`);
  };

  const handleJsonBackup = () => {
    const data = {
      version: 3,
      exportDate: new Date().toISOString(),
      entries,
      orte: JSON.parse(localStorage.getItem('jagd-tracker-orte') || '[]'),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jagd-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON-Backup erstellt!');
  };

  const handleJsonRestore = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.entries && Array.isArray(data.entries)) {
          onImport(data.entries, data.orte || []);
          showToast(`${data.entries.length} Einträge wiederhergestellt!`);
        } else {
          showToast('Ungültiges Backup-Format.');
        }
      } catch {
        showToast('Fehler beim Lesen der Datei.');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const imported = csvToEntries(text);
      if (imported.length > 0) {
        onImport(imported);
        showToast(`${imported.length} Einträge importiert!`);
      } else {
        showToast('Keine gültigen Einträge gefunden.');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleClear = () => {
    const count = entries.length;
    if (!window.confirm(`Alle ${count} Einträge wirklich löschen?\n\nHast du einen Export gemacht?`)) return;
    if (!window.confirm(`Letzte Warnung!\n\nAlle ${count} Einträge werden GELÖSCHT.\nDies kann NICHT rückgängig gemacht werden!`)) return;
    onClearAll();
    showToast('Alle Daten gelöscht.');
  };

  return (
    <div className="page-content">
      <div className="data-section">
        <h3>Darstellung</h3>
        <div className="dark-toggle">
          <label>{'\uD83C\uDF19'} Dunkelmodus</label>
          <label className="switch">
            <input type="checkbox" checked={darkMode} onChange={onToggleDark} />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      {dataInfo && (
        <div className="data-section">
          <h3>Übersicht</h3>
          <div className="data-info">
            <div className="data-info-row">
              <span>Gesamt</span>
              <strong>{entries.length} Einträge</strong>
            </div>
            <div className="data-info-row">
              <span>Ältester Eintrag</span>
              <strong>{dataInfo.oldest}</strong>
            </div>
            <div className="data-info-row">
              <span>Neuester Eintrag</span>
              <strong>{dataInfo.newest}</strong>
            </div>
          </div>
        </div>
      )}

      <div className="data-section">
        <h3>CSV Export</h3>
        <p className="import-info">Exportiere alle Einträge als CSV-Datei für Backup oder Excel-Auswertung.</p>
        <button className="data-btn" onClick={handleExport} disabled={entries.length === 0}>
          {'\uD83D\uDCE5'} Alle Daten als CSV exportieren
        </button>
      </div>

      <div className="data-section">
        <h3>JSON Backup</h3>
        <button className="data-btn" onClick={handleJsonBackup} disabled={entries.length === 0}>
          {'\uD83D\uDCBE'} Vollständiges Backup (JSON)
        </button>
        <button className="data-btn" onClick={() => jsonRef.current?.click()}>
          {'\uD83D\uDD04'} Backup wiederherstellen
        </button>
        <input ref={jsonRef} type="file" accept=".json" onChange={handleJsonRestore} style={{ display: 'none' }} />
      </div>

      <div className="data-section">
        <h3>CSV Import</h3>
        <button className="data-btn" onClick={() => fileRef.current?.click()}>
          {'\uD83D\uDCE4'} CSV-Datei importieren
        </button>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} style={{ display: 'none' }} />
        <p className="import-info">
          Importierte Daten werden zu bestehenden hinzugefügt (keine Überschreibung).
        </p>
      </div>

      <div className="data-section danger-zone">
        <h3>Gefahrenzone</h3>
        <p className="import-info">Lösche alle Daten unwiderruflich. Exportiere vorher!</p>
        <button className="data-btn danger" onClick={handleClear} disabled={entries.length === 0}>
          {'\uD83D\uDDD1\uFE0F'} Alle Daten löschen
        </button>
      </div>
    </div>
  );
}
