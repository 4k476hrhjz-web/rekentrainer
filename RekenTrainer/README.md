# RekenTrainer

Gratis web-app (PWA) voor het automatiseren van optellen en aftrekken tot 20. Zie [`../BRIEFING_REKENEN_TOT_20.md`](../BRIEFING_REKENEN_TOT_20.md) voor de volledige opdracht en achtergrond.

## Lokaal bekijken

```
node _devserver.js
```

Open daarna `http://localhost:4173` in de browser.

## Gratis online zetten (GitHub Pages)

1. Maak gratis een account op [github.com](https://github.com) (als je die nog niet hebt).
2. Maak een nieuwe, lege **public** repository, bijvoorbeeld genaamd `rekentrainer`.
3. Upload de inhoud van deze map (`RekenTrainer/`) naar die repository — dat kan via de "Add file → Upload files" knop op github.com, slepen en neerzetten mag.
4. Ga in de repository naar **Settings → Pages**, kies bij "Source" de map `main` / `/ (root)`, en klik Save.
5. Na een paar minuten staat de app live op een adres als `https://<jouw-gebruikersnaam>.github.io/rekentrainer/`.

## Op de iPad zetten

1. Open de link uit stap 5 hierboven in **Safari** op de iPad.
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
