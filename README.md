# SEPA QR-code generator

Een eenvoudige, volledig **client-side** webapp die SEPA QR-codes genereert
voor bankoverschrijvingen — een zelf-hostbare kloon van scan-en-betaal.be.

Je vult een formulier in (naam, IBAN, optioneel bedrag en mededeling) en de
app tekent live een QR-code die je met je bank-app kunt scannen om de
overschrijving voor te bereiden.

## Privacy

- **Geen server, geen backend.** Alles draait in je browser.
- **Geen tracking, geen logging, geen externe requests.** De QR-bibliotheek is
  lokaal mee-geleverd (`vendor/qrcode.js`), er wordt niets van een CDN geladen.
- Je kunt de pagina zelfs offline of vanaf een USB-stick openen.

## Gebruik

Open `index.html` in een browser. Klaar.

Voor zelf hosten: zet de bestanden op eender welke statische webserver
(GitHub Pages, Netlify, nginx, een mapje achter Apache, ...). Er is geen
build-stap nodig.

```
index.html      formulier + layout
style.css       opmaak
app.js          payload-opbouw, validatie en QR-generatie
vendor/qrcode.js  QR-code-bibliotheek (qrcode-generator, MIT-licentie)
```

## Wat het genereert

De QR-inhoud volgt de **EPC069-12**-standaard van de European Payments Council
(SEPA Credit Transfer, versie 002, UTF-8). Dit is hetzelfde formaat dat de
meeste Europese bank-apps herkennen.

De app valideert:

- **IBAN** via de ISO 7064 mod-97-controle;
- **BIC** op formaat (optioneel — niet nodig in versie 002);
- **bedrag** binnen het toegelaten bereik (€0,01 – €999.999.999,99);
- **gestructureerde mededeling** (Belgisch `+++.../...../.....+++`) via mod-97.

## Licentie

De QR-bibliotheek (`vendor/qrcode.js`) is van Kazuhiko Arase en valt onder de
MIT-licentie. De rest van deze app mag je vrij gebruiken en aanpassen.
