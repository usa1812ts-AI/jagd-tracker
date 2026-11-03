import React, { useState, useEffect, useCallback, useRef } from 'react';
import SunCalc from 'suncalc';

const MAX_PHOTOS = 5;
const MAX_SIZE_KB = 800;
const STORAGE_LIMIT = 5 * 1024 * 1024; // 5MB safe limit

function getStorageUsed() {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      total += (key || '').length * 2 + (localStorage.getItem(key) || '').length * 2;
    }
    return total;
  } catch { return 0; }
}

function getStoragePercent() {
  return Math.round((getStorageUsed() / STORAGE_LIMIT) * 100);
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 1920;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.8;
        let result = canvas.toDataURL('image/jpeg', quality);
        while (result.length > MAX_SIZE_KB * 1024 * 1.37 && quality > 0.1) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        if (result.length > MAX_SIZE_KB * 1024 * 1.37) {
          const scale = 0.6;
          canvas.width = Math.round(width * scale);
          canvas.height = Math.round(height * scale);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          result = canvas.toDataURL('image/jpeg', 0.7);
        }
        resolve(result);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const STRECKE_WILDARTEN = ['Rehwild', 'Schwarzwild', 'Rotwild', 'Damwild', 'Fuchs', 'Hase', 'Sonstiges'];
const WAFFEN = ['Büchse', 'Drilling', 'Flinte'];
const WETTER = [
  { icon: '\u2600\uFE0F', label: 'Sonne', value: 'Sonne' },
  { icon: '\u2601\uFE0F', label: 'Bewölkt', value: 'Bewölkt' },
  { icon: '\uD83C\uDF27\uFE0F', label: 'Regen', value: 'Regen' },
  { icon: '\u2744\uFE0F', label: 'Schnee', value: 'Schnee' },
];
const WIND = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];

function now() {
  return new Date().toTimeString().slice(0, 5);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getSunTimes(dateStr, lat, lng) {
  try {
    const date = new Date(dateStr + 'T12:00:00');
    const times = SunCalc.getTimes(date, lat, lng);
    return {
      sunrise: times.sunrise.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      sunset: times.sunset.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    };
  } catch {
    return null;
  }
}

const EMPTY_FORM = {
  datum: today(),
  ort: '',
  zeitVon: now(),
  zeitBis: '',
  wildartDetails: '',
  schuss: false,
  waffe: '',
  waffentyp: '',
  strecke: false,
  streckeAnzahl: '',
  streckeWildart: '',
  streckeDetails: '',
  wetter: '',
  wind: '',
  begleitung: '',
  notizen: '',
  gps: null,
  sonnenaufgang: '',
  sonnenuntergang: '',
  photos: [],
};

export default function EntryForm({ onSave, orte, onAddOrt, editEntry, onCancelEdit, lastEntry, showToast }) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showNewOrt, setShowNewOrt] = useState(false);
  const [newOrtName, setNewOrtName] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [sunTimes, setSunTimes] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [viewPhoto, setViewPhoto] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const photoRef = useRef(null);

  useEffect(() => {
    if (editEntry) {
      setForm({
        ...EMPTY_FORM,
        ...editEntry,
        wildartDetails: editEntry.wildartDetails || '',
        waffentyp: editEntry.waffentyp || '',
        streckeAnzahl: editEntry.streckeAnzahl || '',
        streckeWildart: editEntry.streckeWildart || '',
        streckeDetails: editEntry.streckeDetails || '',
      });
      setPhotos(editEntry.photos || []);
    }
  }, [editEntry]);

  useEffect(() => {
    if (form.gps && form.datum) {
      const st = getSunTimes(form.datum, form.gps.lat, form.gps.lng);
      setSunTimes(st);
      if (st) {
        setForm(f => ({ ...f, sonnenaufgang: st.sunrise, sonnenuntergang: st.sunset }));
      }
    } else {
      setSunTimes(null);
    }
  }, [form.gps, form.datum]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleOrtChange = (e) => {
    const v = e.target.value;
    if (v === '__new__') {
      setShowNewOrt(true);
      set('ort', '');
    } else {
      setShowNewOrt(false);
      set('ort', v);
    }
  };

  const addNewOrt = () => {
    const trimmed = newOrtName.trim();
    if (trimmed) {
      onAddOrt(trimmed);
      set('ort', trimmed);
      setNewOrtName('');
      setShowNewOrt(false);
    }
  };

  const getGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('GPS nicht verfügbar');
      return;
    }
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const gps = {
          lat: parseFloat(pos.coords.latitude.toFixed(6)),
          lng: parseFloat(pos.coords.longitude.toFixed(6)),
        };
        setForm(f => ({ ...f, gps }));
        setGpsLoading(false);
      },
      (err) => {
        setGpsError(err.code === 1 ? 'GPS-Zugriff verweigert' : 'GPS-Fehler');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleQuickRepeat = () => {
    if (!lastEntry) return;
    setForm({
      ...EMPTY_FORM,
      datum: today(),
      zeitVon: now(),
      zeitBis: '',
      ort: lastEntry.ort || '',
      wildartDetails: lastEntry.wildartDetails || '',
      wetter: lastEntry.wetter || '',
      wind: lastEntry.wind || '',
      begleitung: lastEntry.begleitung || '',
      waffe: lastEntry.waffe || '',
      waffentyp: lastEntry.waffentyp || '',
      gps: lastEntry.gps || null,
    });
  };

  const handlePhoto = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const pct = getStoragePercent();
    if (pct > 95) {
      if (showToast) showToast('\uD83D\uDEAB Speicher voll! Erst Daten exportieren & löschen.');
      e.target.value = '';
      return;
    }
    if (pct > 80) {
      if (!window.confirm(
        `Speicher zu ${pct}% belegt!\n\nTipp: Alte Einträge exportieren & löschen.\n\nTrotzdem fortfahren?`
      )) {
        e.target.value = '';
        return;
      }
    }

    const remaining = MAX_PHOTOS - photos.length;
    const toProcess = files.slice(0, remaining);
    setPhotoLoading(true);
    for (const file of toProcess) {
      try {
        const compressed = await compressImage(file);
        // Check again after each compression
        if (getStoragePercent() > 95) {
          if (showToast) showToast('\uD83D\uDEAB Speicherlimit erreicht!');
          break;
        }
        setPhotos(prev => [...prev, compressed]);
      } catch {
        // skip failed photos
      }
    }
    setPhotoLoading(false);
    e.target.value = '';
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = [];
    if (!form.datum) errors.push('Datum');
    if (!form.ort) errors.push('Ort');
    if (!form.wildartDetails.trim()) errors.push('Wildarten');
    if (form.datum > today()) errors.push('Datum in der Zukunft');
    if (errors.length > 0) {
      if (showToast) showToast('\u26A0\uFE0F ' + errors.join(', ') + ' fehlt');
      const first = document.querySelector('[required]:invalid');
      if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const entry = {
      ...form,
      photos,
      id: editEntry ? editEntry.id : Date.now().toString(),
    };
    onSave(entry);
    setForm({ ...EMPTY_FORM, zeitVon: now(), datum: today() });
    setPhotos([]);
    setSunTimes(null);
  };

  const handleCancel = () => {
    setForm({ ...EMPTY_FORM, zeitVon: now(), datum: today() });
    setPhotos([]);
    setSunTimes(null);
    if (onCancelEdit) onCancelEdit();
  };

  const favOrte = orte.slice(0, 5);

  return (
    <form onSubmit={handleSubmit} className="page-content">
      {editEntry && (
        <div style={{ background: '#fff3e0', padding: '12px 14px', borderRadius: 8, marginBottom: 14, fontSize: '0.88rem', fontWeight: 700, color: '#e65100' }}>
          Eintrag bearbeiten
        </div>
      )}

      {!editEntry && lastEntry && (
        <button type="button" className="btn-quick" onClick={handleQuickRepeat}>
          {'\u26A1'} Letzten Ansitz wiederholen
        </button>
      )}

      <div className="form-section">
        <h3>Wann & Wo</h3>
        <div className="form-group">
          <label>Datum *</label>
          <input type="date" value={form.datum} max={today()} onChange={e => set('datum', e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Ort / Revier *</label>
          {favOrte.length > 0 && (
            <div className="fav-row">
              {favOrte.map(o => (
                <button key={o} type="button" className={`fav-btn ${form.ort === o ? 'active' : ''}`} onClick={() => { set('ort', o); setShowNewOrt(false); }}>
                  {o}
                </button>
              ))}
            </div>
          )}
          <select value={form.ort} onChange={handleOrtChange} required>
            <option value="">-- Ort wählen --</option>
            {orte.map(o => <option key={o} value={o}>{o}</option>)}
            <option value="__new__">+ Neuer Ort</option>
          </select>
          {showNewOrt && (
            <div className="new-ort-input">
              <input type="text" placeholder="Neuer Ort..." value={newOrtName} onChange={e => setNewOrtName(e.target.value)} />
              <button type="button" onClick={addNewOrt}>OK</button>
            </div>
          )}
        </div>
        <div className="form-group">
          <label>GPS-Standort</label>
          <div className="gps-bar">
            <button type="button" onClick={getGPS} disabled={gpsLoading}>
              {gpsLoading ? 'Suche...' : '\uD83D\uDCCD Standort erfassen'}
            </button>
            {form.gps && (
              <span className="gps-coords">{form.gps.lat}, {form.gps.lng}</span>
            )}
            {gpsError && <span style={{ color: '#c62828', fontSize: '0.78rem' }}>{gpsError}</span>}
          </div>
          {sunTimes && (
            <div className="sun-bar">
              <span>{'\u2600\uFE0F'} Auf: {sunTimes.sunrise}</span>
              <span>{'\uD83C\uDF05'} Unter: {sunTimes.sunset}</span>
            </div>
          )}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Von</label>
            <input type="time" value={form.zeitVon} onChange={e => set('zeitVon', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Bis</label>
            <input type="time" value={form.zeitBis} onChange={e => set('zeitBis', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Beobachtung</h3>
        <div className="form-group">
          <label>Wildarten & Sichtungen *</label>
          <textarea
            placeholder="z.B. 1 Bock, 2 Schmalreh, 3 Hasen"
            rows="3"
            value={form.wildartDetails}
            onChange={e => set('wildartDetails', e.target.value)}
            required
          />
          <small className="field-hint">Tipp: Eine Zeile pro Wildart, z.B. "2 Böcke, 1 Geiß"</small>
        </div>
      </div>

      <div className="form-section">
        <h3>Schuss</h3>
        <div className="form-group">
          <label>Schuss abgegeben?</label>
          <div className="toggle-group">
            <button type="button" className={`toggle-btn ${!form.schuss ? 'active' : ''}`} onClick={() => { set('schuss', false); set('waffe', ''); set('waffentyp', ''); set('strecke', false); set('streckeAnzahl', ''); set('streckeWildart', ''); set('streckeDetails', ''); }}>Nein</button>
            <button type="button" className={`toggle-btn ${form.schuss ? 'active' : ''}`} onClick={() => set('schuss', true)}>Ja</button>
          </div>
        </div>
        {form.schuss && (
          <>
            <div className="form-group">
              <label>Waffe</label>
              <select value={form.waffe} onChange={e => set('waffe', e.target.value)}>
                <option value="">-- Waffe --</option>
                {WAFFEN.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Waffentyp (optional)</label>
              <input
                type="text"
                placeholder="z.B. Blaser R8, Merkel 160"
                maxLength={50}
                value={form.waffentyp}
                onChange={e => set('waffentyp', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Strecke?</label>
              <div className="toggle-group">
                <button type="button" className={`toggle-btn ${!form.strecke ? 'active' : ''}`} onClick={() => { set('strecke', false); set('streckeAnzahl', ''); set('streckeWildart', ''); set('streckeDetails', ''); }}>Nein</button>
                <button type="button" className={`toggle-btn ${form.strecke ? 'active' : ''}`} onClick={() => set('strecke', true)}>Ja</button>
              </div>
            </div>
            {form.strecke && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>Stücke</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      placeholder="Anzahl"
                      value={form.streckeAnzahl}
                      onChange={e => set('streckeAnzahl', e.target.value)}
                      inputMode="numeric"
                    />
                  </div>
                  <div className="form-group">
                    <label>Wildart</label>
                    <select value={form.streckeWildart} onChange={e => set('streckeWildart', e.target.value)}>
                      <option value="">-- wählen --</option>
                      {STRECKE_WILDARTEN.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Strecke-Details (optional)</label>
                  <textarea
                    placeholder="z.B. Bock 2-jährig, Schmalreh"
                    maxLength={200}
                    value={form.streckeDetails}
                    onChange={e => set('streckeDetails', e.target.value)}
                    style={{ minHeight: 60 }}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="form-section">
        <h3>Bedingungen</h3>
        <div className="form-group">
          <label>Wetter</label>
          <div className="weather-grid">
            {WETTER.map(w => (
              <button key={w.value} type="button" className={`weather-btn ${form.wetter === w.value ? 'active' : ''}`} onClick={() => set('wetter', w.value)}>
                {w.icon}<span>{w.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Windrichtung</label>
          <div className="wind-grid">
            {WIND.map(w => (
              <button key={w} type="button" className={`wind-btn ${form.wind === w ? 'active' : ''}`} onClick={() => set('wind', w)}>{w}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Sonstiges</h3>
        <div className="form-group">
          <label>Begleitung</label>
          <input type="text" placeholder="Optional..." value={form.begleitung} onChange={e => set('begleitung', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Notizen</label>
          <textarea placeholder="Freitext..." value={form.notizen} onChange={e => set('notizen', e.target.value)} />
        </div>
      </div>

      <div className="form-section">
        <h3>Fotos</h3>
        <div className="form-group">
          <label>Fotos ({photos.length}/{MAX_PHOTOS})</label>
          {photoLoading && (
            <div className="photo-loading">{'\u23F3'} Foto wird komprimiert...</div>
          )}
          {photos.length < MAX_PHOTOS && !photoLoading && (
            <>
              <button type="button" className="photo-add-btn" onClick={() => photoRef.current?.click()}>
                {'\uD83D\uDCF7'} Foto aufnehmen / wählen
              </button>
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handlePhoto}
                style={{ display: 'none' }}
              />
            </>
          )}
          {photos.length > 0 && (
            <div className="photo-grid">
              {photos.map((p, i) => (
                <div key={i} className="photo-thumb-wrap">
                  <img src={p} alt={`Foto ${i + 1}`} className="photo-thumb" onClick={() => setViewPhoto(p)} />
                  <button type="button" className="photo-remove" onClick={() => removePhoto(i)}>{'\u2716'}</button>
                </div>
              ))}
            </div>
          )}
          <small className="field-hint">Max. {MAX_PHOTOS} Fotos, automatisch komprimiert.</small>
        </div>
      </div>

      {viewPhoto && (
        <div className="photo-fullscreen" onClick={() => setViewPhoto(null)}>
          <img src={viewPhoto} alt="Vollbild" />
          <button className="photo-fullscreen-close" onClick={() => setViewPhoto(null)}>{'\u2716'}</button>
        </div>
      )}

      <button type="submit" className="btn-submit">
        {editEntry ? 'Änderungen speichern' : 'Ansitz speichern'}
      </button>
      {editEntry && (
        <button type="button" className="btn-secondary" onClick={handleCancel}>Abbrechen</button>
      )}
    </form>
  );
}
