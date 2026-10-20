# SEPA QR-code generator

Een eenvoudige, volledig **client-side** webapp die SEPA QR-codes genereert
voor bankoverschrijvingen — een zelf-hostbare kloon van scan-en-betaal.be.

Je vult een formulier in (naam, IBAN, optioneel bedrag en mededeling) en de
app tekent live een QR-code die je met je bank-app kunt scannen om de
overschrijving voor te bereiden.

Gebruik 'm nu: https://sepa.small-victories.co

## Privacy

- **Geen server, geen backend.** Alles draait in je browser.
- **Je betaalgegevens verlaten je browser nooit.** De QR-bibliotheek is lokaal
  mee-geleverd (`vendor/qrcode.js`), het formulier wordt nooit ingediend en de
  app zet niets in de URL.
- **Bezoekersstatistieken alleen met toestemming.** `consent.js` laadt Google
  Tag Manager (`GTM_ID` bovenaan het bestand) met Google Consent Mode v2: alles
  staat standaard op "denied", en Google Analytics zet pas cookies na
  "Accepteren" in de cookiebanner. `consent.js` haalt query en hash uit de URL
  voor GTM ze kan lezen. Zet `GTM_ID` leeg en er wordt niets geladen.
- De generator werkt ook offline of vanaf een USB-stick (zonder statistieken).

## Gebruik

Open `index.html` in een browser. Klaar.

Voor zelf hosten: zet de bestanden op eender welke statische webserver
(GitHub Pages, Netlify, nginx, een mapje achter Apache, ...). Er is geen
build-stap nodig.

```
index.html      formulier + layout
privacy.html    privacyverklaring (/privacy)
consent.js      cookiebanner + Google Tag Manager (Consent Mode v2)
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
