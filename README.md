# Jagd-Tracker

Digitales Revierbuch als Progressive Web App (PWA) mit Offline-Funktionalitat.

## Features

- **Progressive Web App** - Installierbar auf iPhone/Android
- **Offline-fahig** - Funktioniert ohne Internetverbindung
- **GPS-Integration** - Automatische Standorterkennung
- **Sonnenzeiten** - Automatische Berechnung basierend auf Datum & GPS
- **Dark Mode** - Augenschonend bei Dammerung/Nacht
- **Statistiken** - Auswertungen nach Wildart, Revier, Ansitzzeiten
- **Lokale Speicherung** - Daten bleiben dauerhaft erhalten
- **CSV/JSON Export/Import** - Datensicherung und -austausch

## Installation auf iPhone

1. Safari offnen: https://usa1812ts-AI.github.io/jagd-tracker
2. Teilen-Button antippen, dann "Zum Home-Bildschirm"
3. App-Icon auf Home-Screen antippen

## Offline-Nutzung

Nach der ersten Installation funktioniert die App komplett ohne Internet.
Alle Daten werden lokal gespeichert, GPS funktioniert ohne Netz.

## Entwicklung

```bash
npm install
npm run dev       # lokaler Entwicklungsserver (http://localhost:3000/jagd-tracker/)
npm run build     # Produktions-Build nach build/
npm run preview   # Build lokal testen
npm run deploy    # Build auf GitHub Pages veröffentlichen
```

## Technologie

- React 19
- Vite (Build-Tool)
- Service Workers (Offline-Support)
- localStorage (Datenpersistenz)
- Geolocation API
- SunCalc (Sonnenzeiten)
- GitHub Pages (Hosting)
