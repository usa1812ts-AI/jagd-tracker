import React, { useRef } from 'react';

const CSV_HEADER = 'Datum;Ort;Wildart;Anzahl;Details;Uhrzeit Von;Uhrzeit Bis;Schuss;Waffe;Wetter;Wind;Begleitung;Notizen;Strecke;GPS Lat;GPS Lng;Sonnenaufgang;Sonnenuntergang';

function entriesToCSV(entries) {
  const rows = entries.map(e => [
    e.datum || '',
    e.ort || '',
    e.wildart || '',
    e.anzahl || '',
    e.details || '',
    e.zeitVon || '',
    e.zeitBis || '',
    e.schuss ? 'Ja' : 'Nein',
    e.waffe || '',
    e.wetter || '',
    e.wind || '',
    e.begleitung || '',
    (e.notizen || '').replace(/\n/g, ' '),
    e.strecke ? 'Ja' : 'Nein',
    e.gps ? e.gps.lat : '',
    e.gps ? e.gps.lng : '',
    e.sonnenaufgang || '',
    e.sonnenuntergang || '',
  ].join(';'));
  return [CSV_HEADER, ...rows].join('\n');
}

function csvToEntries(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const entries = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';');
    if (cols.length < 8) continue;
    const lat = parseFloat(cols[14]);
    const lng = parseFloat(cols[15]);
    entries.push({
      id: Date.now().toString() + i,
      datum: cols[0] || '',
      ort: cols[1] || '',
      wildart: cols[2] || '',
      anzahl: parseInt(cols[3]) || 1,
      details: cols[4] || '',
      zeitVon: cols[5] || '',
      zeitBis: cols[6] || '',
      schuss: (cols[7] || '').toLowerCase() === 'ja',
      waffe: cols[8] || '',
      wetter: cols[9] || '',
      wind: cols[10] || '',
      begleitung: cols[11] || '',
      notizen: cols[12] || '',
      strecke: (cols[13] || '').toLowerCase() === 'ja',
      gps: (!isNaN(lat) && !isNaN(lng) && cols[14]) ? { lat, lng } : null,
      sonnenaufgang: cols[16] || '',
      sonnenuntergang: cols[17] || '',
    });
  }
  return entries;
}

export default function DataManager({ entries, onImport, onClearAll, showToast, darkMode, onToggleDark }) {
  const fileRef = useRef(null);
  const jsonRef = useRef(null);

  const handleExport = () => {
    const csv = entriesToCSV(entries);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jagd-tracker-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exportiert!');
  };

  const handleJsonBackup = () => {
    const data = {
      version: 2,
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
    if (window.confirm('Alle Daten wirklich löschen? Dies kann nicht rückgängig gemacht werden!')) {
      onClearAll();
      showToast('Alle Daten gelöscht.');
    }
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

      <div className="data-section">
        <h3>CSV Export</h3>
        <button className="data-btn" onClick={handleExport} disabled={entries.length === 0}>
          {'\uD83D\uDCE5'} Alle Daten als CSV exportieren
        </button>
        <p className="import-info">{entries.length} Einträge vorhanden</p>
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
          Format: Datum;Ort;Wildart;Anzahl;Details;Uhrzeit Von;Uhrzeit Bis;Schuss;Waffe;Wetter;Wind;Begleitung;Notizen;Strecke
        </p>
      </div>

      <div className="data-section">
        <h3>Daten zurücksetzen</h3>
        <button className="data-btn danger" onClick={handleClear} disabled={entries.length === 0}>
          {'\uD83D\uDDD1\uFE0F'} Alle Daten löschen
        </button>
      </div>
    </div>
  );
}
