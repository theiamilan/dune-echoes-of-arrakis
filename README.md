# DUNE — Echoes of Arrakis

Eine kurze spielbare Three.js-Fandemo: isometrische Erkundung im Stil klassischer Rollenspiele, ein Fremen-Dialog, drei Spice-Proben und eine Begegnung mit Shai-Hulud. Dauer: ungefähr 3–5 Minuten.

## Starten

Node.js 20.19+ oder 22.12+ verwenden.

```sh
npm install
npm run dev
```

Die im Terminal angezeigte lokale Adresse im aktuellen Chrome, Edge oder Firefox öffnen. Die Grafik benötigt WebGL 2. Der Browser lädt keine Modelle von einem externen Dienst. Die optionalen Google Fonts haben lokale Systemschrift-Fallbacks.

```sh
npm run build
npm run preview
node --test tests/navigation.test.js
```

## Steuerung

| Eingabe | Aktion |
| --- | --- |
| Linksklick auf den Boden | Zum Ziel laufen, mit Hindernisumgehung |
| Linksklick auf ein Objekt | Hinlaufen und interagieren |
| WASD / Pfeiltasten | Direkt bewegen, relativ zur Kamera |
| E | Mit einem nahen Ziel interagieren |
| 1 / 2 | Dialogantwort wählen |
| Q | Umgebung scannen |
| J | Journal öffnen |
| C / rechte Maustaste ziehen | Kamera drehen |
| Mausrad | Zoom |
| Leertaste | Taktische Pause |
| H | HUD für freie Bildansicht ausblenden |
| Escape | Dialog oder Fenster schließen |

Ton und Grafikqualität lassen sich oben rechts einstellen. Der Ton startet ausgeschaltet; Wind und Klangsignale werden lokal mit Web Audio erzeugt. Klickbewegung und die Bildschirmtasten funktionieren auch ohne Tastatur.

## Inhalt und Technik

- Echtzeit-3D mit orthografischer Kamera, detaillierten prozeduralen Modellen, Schatten, Bloom, Filmkorn, Nebel, Sandstaub und Fußspuren.
- Begehbares Dünengelände mit erzeugter Sandtextur, Felsformationen, Außenposten, Ornithopter, Stillsuits und animiertem Sandwurm.
- Kleine lineare Mission mit Dialogauswahl, Ressourcensammlung, Klopfer-Sequenz und Extraktion. Die taktische Pause hält die Erkundung an; diese Demo enthält kein rundenbasiertes Kampfsystem.
- A*-Navigation mit Kreis-Hindernissen, Sicherheitsabstand und Eckenschutz; automatische Tests in `tests/navigation.test.js`.
- Statische Modellteile sind nach Material zusammengefasst; kleine Steine werden instanziert.

## Bildgenerierung

Die Bilder in `public/assets/` wurden mit dem eingebauten Bildgenerator erstellt. `arrakis-concept.png` dient als Titelbild und Gestaltungsreferenz für die anschließend in Three.js modellierte Architektur. `sand.png` wird als Farb- und Bumptextur des Geländes verwendet; `rock.png` ergänzt die Felsen und Architektur mittels triplanarer Texturprojektion. Es handelt sich nicht um eine automatische Bild-zu-3D-Rekonstruktion.

Exakte Prompts, Herkunft und Farbpalette: [docs/art-direction.md](docs/art-direction.md).

Three.js-Postprocessing folgt der [offiziellen Dokumentation](https://threejs.org/manual/en/post-processing.html).

Inoffizielles Fanprojekt, nicht mit den Rechteinhabern von Dune verbunden.
