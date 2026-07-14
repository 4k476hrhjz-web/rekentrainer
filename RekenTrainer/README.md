# RekenTrainer

Gratis web-app (PWA) voor het automatiseren van optellen en aftrekken tot 20. Zie [`../BRIEFING_REKENEN_TOT_20.md`](../BRIEFING_REKENEN_TOT_20.md) voor de volledige opdracht en achtergrond.

## Lokaal bekijken

```
node _devserver.js
```

Open daarna `http://localhost:4173` in de browser.


## Op de iPad zetten

1. Open de link op de iPad.
2. Tik op de deelknop (vierkantje met pijl omhoog) onderin.
3. Kies **"Zet op beginscherm"**.
4. Klaar — het icoontje staat nu op het beginscherm en opent de app fullscreen, zonder Safari-balken.
5. Test één keer met vliegtuigmodus aan of alles nog werkt (moet, want alles wordt lokaal opgeslagen na de eerste keer laden).

## Bestanden

- `index.html` — de schermen (start, sessie, flitssommen, beloning, ouderscherm)
- `style.css` — vormgeving, groot en kindvriendelijk
- `questions.js` — vraaggeneratie per fase (leerlijn)
- `storage.js` — voortgang, streaks, spaced repetition, badges (alles in `localStorage`, blijft op het apparaat)
- `app.js` — schermlogica, geluid, confetti
- `service-worker.js` + `manifest.json` + `icons/` — zorgen dat de app offline werkt en als icoon op het beginscherm komt
