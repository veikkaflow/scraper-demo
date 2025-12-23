# Testausohjeet

## Paikallinen testaus

### 1. Asenna riippuvuudet

```bash
npm install
```

### 2. Käynnistä palvelu

```bash
npm start
```

Palvelu käynnistyy porttiin 3000.

### 3. Testaa API:ta

#### Health check
```bash
curl http://localhost:3000/health
```

#### WordPress-verkkokauppa
```bash
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example-wp-shop.com", "mode": "wordpress"}'
```

#### Custom verkkokauppa (automaattinen tunnistus)
```bash
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example-shop.com"}'
```

#### Yrityssivut
```bash
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example-company.com", "mode": "company"}'
```

## Testaus Postmanissa tai Thunder Clientissa

1. **Method**: POST
2. **URL**: `http://localhost:3000/scrape`
3. **Headers**: 
   - `Content-Type: application/json`
4. **Body** (raw JSON):
```json
{
  "url": "https://example.com",
  "mode": "wordpress"
}
```

## Odotettu vastaus

Onnistunut vastaus:
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "title": "Product Name",
        "price": "29.99 €",
        "price_numeric": 29.99,
        "availability": "In stock",
        "availability_normalized": "in_stock"
      }
    ]
  },
  "metadata": {
    "mode": "wordpress",
    "url": "https://example.com",
    "sitemapUsed": true,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

## Vianetsintä

### Puppeteer ei käynnisty
- Varmista että Chromium on asennettu
- Windows: Puppeteer asentaa Chromiumin automaattisesti
- Jos ongelmia, tarkista että `node_modules/puppeteer/.local-chromium` on olemassa

### Timeout-virheet
- Kasvata timeout-aikaa `src/core/scraper.js` tiedostossa
- Tarkista että verkkosivusto on saatavilla

### Sitemap-virheet
- Tarkista että sitemap.xml on saatavilla: `https://example.com/sitemap.xml`
- Jos sitemapia ei löydy, scraper käyttää pääsivua

### Mode-tunnistus ei toimi
- Määritä mode manuaalisesti API-pyynnössä: `{"url": "...", "mode": "wordpress"}`

