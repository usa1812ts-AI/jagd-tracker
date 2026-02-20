import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';
import EntryForm from './components/EntryForm';
import ListView from './components/ListView';
import Dashboard from './components/Dashboard';
import DataManager from './components/DataManager';

const STORAGE_KEY = 'jagd-tracker-entries';
const ORTE_KEY = 'jagd-tracker-orte';
const DARK_KEY = 'jagd-tracker-dark';

function migrateEntry(entry) {
  if (entry.wildart && !entry.wildartDetails) {
    entry.wildartDetails = `${entry.anzahl || 1} ${entry.wildart}${entry.details ? ' - ' + entry.details : ''}`;
    delete entry.wildart;
    delete entry.anzahl;
    delete entry.details;
  }
  return entry;
}

function loadEntries() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    return raw.map(migrateEntry);
  } catch { return []; }
}

function loadOrte() {
  try {
    return JSON.parse(localStorage.getItem(ORTE_KEY)) || [];
  } catch { return []; }
}

export default function App() {
  const [page, setPage] = useState('form');
  const [entries, setEntries] = useState(loadEntries);
  const [orte, setOrte] = useState(loadOrte);
  const [toast, setToast] = useState('');
  const [editEntry, setEditEntry] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem(DARK_KEY);
    return saved === 'true';
  });

  // Online/Offline detection
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Apply dark mode to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem(DARK_KEY, darkMode);
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem(ORTE_KEY, JSON.stringify(orte));
  }, [orte]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);

  // Sort orte by frequency of use
  const sortedOrte = useMemo(() => {
    const counts = {};
    entries.forEach(e => {
      if (e.ort) counts[e.ort] = (counts[e.ort] || 0) + 1;
    });
    return [...orte].sort((a, b) => (counts[b] || 0) - (counts[a] || 0));
  }, [orte, entries]);

  // Last entry for quick repeat
  const lastEntry = useMemo(() => {
    if (entries.length === 0) return null;
    const sorted = [...entries].sort((a, b) => {
      const da = a.datum + (a.zeitVon || '');
      const db = b.datum + (b.zeitVon || '');
      return db.localeCompare(da);
    });
    return sorted[0];
  }, [entries]);

  const handleSave = (entry) => {
    setEntries(prev => {
      const idx = prev.findIndex(e => e.id === entry.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = entry;
        return updated;
      }
      return [...prev, entry];
    });
    setEditEntry(null);
    showToast(editEntry ? 'Eintrag aktualisiert!' : 'Ansitz gespeichert!');
  };

  const handleAddOrt = (name) => {
    setOrte(prev => prev.includes(name) ? prev : [...prev, name].sort());
  };

  const handleDelete = (id) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    showToast('Eintrag gelöscht.');
  };

  const handleEdit = (entry) => {
    setEditEntry(entry);
    setPage('form');
  };

  const handleImport = (imported, importedOrte) => {
    if (importedOrte && importedOrte.length > 0) {
      setEntries(imported);
      setOrte(importedOrte);
    } else {
      setEntries(prev => [...prev, ...imported]);
      const newOrte = [...new Set(imported.map(e => e.ort).filter(Boolean))];
      setOrte(prev => [...new Set([...prev, ...newOrte])].sort());
    }
  };

  const handleClearAll = () => {
    setEntries([]);
  };

  return (
    <div className="app">
      {!isOnline && (
        <div className="offline-banner">
          {'\uD83D\uDCE1'} Offline-Modus aktiv
        </div>
      )}

      <header className="app-header">
        <h1>{'\uD83E\uDD8C'} Jagd-Tracker</h1>
        <div className="subtitle">Digitales Revierbuch</div>
      </header>

      {toast && <div className="toast">{toast}</div>}

      {page === 'form' && (
        <EntryForm
          onSave={handleSave}
          orte={sortedOrte}
          onAddOrt={handleAddOrt}
          editEntry={editEntry}
          onCancelEdit={() => setEditEntry(null)}
          lastEntry={lastEntry}
        />
      )}
      {page === 'list' && (
        <ListView
          entries={entries}
          orte={sortedOrte}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
      )}
      {page === 'dashboard' && <Dashboard entries={entries} />}
      {page === 'data' && (
        <DataManager
          entries={entries}
          onImport={handleImport}
          onClearAll={handleClearAll}
          showToast={showToast}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(d => !d)}
        />
      )}

      <nav className="bottom-nav">
        <button className={page === 'form' ? 'active' : ''} onClick={() => setPage('form')}>
          <span className="nav-icon">{'\u270D\uFE0F'}</span>Neuer Ansitz
        </button>
        <button className={page === 'list' ? 'active' : ''} onClick={() => setPage('list')}>
          <span className="nav-icon">{'\uD83D\uDCCB'}</span>Liste
        </button>
        <button className={page === 'dashboard' ? 'active' : ''} onClick={() => setPage('dashboard')}>
          <span className="nav-icon">{'\uD83D\uDCCA'}</span>Statistik
        </button>
        <button className={page === 'data' ? 'active' : ''} onClick={() => setPage('data')}>
          <span className="nav-icon">{'\u2699\uFE0F'}</span>Daten
        </button>
      </nav>
    </div>
  );
}
