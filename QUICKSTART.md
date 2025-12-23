# Nopea käynnistys

## 1. Asenna riippuvuudet

```bash
npm install
```

Tämä asentaa kaikki tarvittavat paketit, mukaan lukien Puppeteer (joka asentaa Chromiumin automaattisesti).

## 2. Käynnistä palvelu

```bash
npm start
```

Palvelu käynnistyy porttiin 3000. Näet konsolissa:
```
Scraper service running on port 3000
```

## 3. Testaa palvelua

Avaa uusi terminaali ja testaa:

```bash
# Health check
curl http://localhost:3000/health

# Testaa scrapingia (korvaa URL oikealla osoitteella)
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"https://example.com\", \"mode\": \"company\"}"
```

## 4. Kehitysmoodi (automaattinen uudelleenkäynnistys)

```bash
npm run dev
```

## Ongelmat?

- **Portti on varattu**: Muuta PORT ympäristömuuttujassa tai `.env`-tiedostossa
- **Puppeteer-virheet**: Varmista että `npm install` suoritettiin loppuun
- **Timeout-virheet**: Tarkista että verkkosivusto on saatavilla

Katso `TESTING.md` tiedostosta lisää testausohjeita.

