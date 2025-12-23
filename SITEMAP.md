# Sitemap-tuki

## Yleistä

Sitemap-tuki on **opt-in** -ominaisuus. Oletuksena scraper ei käytä sitemappia, vaan scrapeaa suoraan annetun URL:n sisällön.

## Mitä tietoja sitemapista voidaan lukea?

Sitemapista voidaan lukea seuraavat tiedot:

### Perustiedot
- **URL** (`<loc>`) - Sivun URL-osoite
- **Last Modified** (`<lastmod>`) - Viimeisin muokkauspäivämäärä (ISO 8601 muodossa)
- **Change Frequency** (`<changefreq>`) - Muutosfrekvenssi:
  - `always` - Sivusto päivittyy aina
  - `hourly` - Tunti välein
  - `daily` - Päivittäin
  - `weekly` - Viikoittain
  - `monthly` - Kuukausittain
  - `yearly` - Vuosittain
  - `never` - Ei koskaan päivity
- **Priority** (`<priority>`) - Prioriteetti (0.0 - 1.0)

### Sitemap Index
Jos sitemap on sitemap index (sisältää useita sitemapeja), parseri käsittelee ne rekursiivisesti.

## Käyttö

### Perushaku (ilman sitemappia)

Oletuksena scraper ei käytä sitemappia:

```bash
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/products", "mode": "wordpress"}'
```

### Sitemap-haku

Jos haluat käyttää sitemappia, aseta `useSitemap: true`:

```bash
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "mode": "wordpress", "useSitemap": true}'
```

## Vastaus

Kun `useSitemap: true`, vastaus sisältää sitemap-datan:

```json
{
  "success": true,
  "data": {
    "products": [...],
    "title": "..."
  },
  "metadata": {
    "mode": "wordpress",
    "url": "https://example.com",
    "sitemapUsed": true,
    "timestamp": "2024-01-01T12:00:00.000Z"
  },
  "sitemapData": {
    "sitemapUrl": "https://example.com/sitemap.xml",
    "urls": [
      {
        "url": "https://example.com/product1",
        "lastmod": "2024-01-01T00:00:00Z",
        "changefreq": "weekly",
        "priority": 0.8
      },
      {
        "url": "https://example.com/product2",
        "lastmod": "2023-12-15T00:00:00Z",
        "changefreq": "monthly",
        "priority": 0.6
      }
    ],
    "totalUrls": 2
  }
}
```

## Huomioita

1. **Sitemap ei muuta scrapingia**: Vaikka käytät sitemappia, scraper scrapeaa silti annetun URL:n sisällön. Sitemap-tiedot ovat vain lisätietoa.

2. **Sitemap-metadata**: Sitemap-tiedot (lastmod, changefreq, priority) ovat saatavilla vastauksessa, mutta ne eivät vaikuta scraping-prosessiin.

3. **Sitemap Index**: Jos sitemap on sitemap index, parseri käsittelee kaikki nested sitemapit automaattisesti.

4. **Suorituskyky**: Sitemap-parsinta voi olla hidas, jos sitemap on suuri tai sisältää useita nested sitemapeja.

## Käyttötapaukset

### 1. Perussivun scraping (ei sitemappia)
```json
{
  "url": "https://shop.com/products",
  "mode": "wordpress"
}
```

### 2. Sitemap-tietojen haku
```json
{
  "url": "https://shop.com",
  "mode": "wordpress",
  "useSitemap": true
}
```

### 3. Tuotesivun scraping (ei sitemappia)
```json
{
  "url": "https://shop.com/product-category/mens",
  "mode": "wordpress"
}
```

## Konfiguraatio

Sitemap-tuki voidaan ottaa käyttöön/pois käytöstä moodikonfiguraatiossa:

```json
{
  "sitemap": {
    "enabled": false,  // Oletus: false (ei käytä sitemappia)
    "priority": false
  }
}
```

Huom: Vaikka `enabled: true`, sitemappia käytetään vain jos API-pyynnössä on `useSitemap: true`.

