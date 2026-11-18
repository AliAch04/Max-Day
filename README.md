# All-Day

Emploi du temps 05h00–23h00 sur 7 jours (PWA, sans dépendance).
Les priorités (Étude, Prière, Resto, Sport) sont modifiables dans l’interface et mémorisées sur l’appareil.

## Lancer en local
    python3 -m http.server 8000
puis ouvrir http://localhost:8000

## Modifier les horaires
Tout est dans `data.json` : `events` (cours, resto, sport…), `prayers` (horaires par date),
`overrides` (ex. Asr placé à 15h30 pendant la pause, Jumu’a le vendredi).
Jours : 0 = lundi … 6 = dimanche.

## Mise à jour du service worker
Après un changement de fichiers, incrémenter `C` dans `sw.js` (ex. `allday-v2`).
