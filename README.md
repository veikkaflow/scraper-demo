# Web Scraper Service

Joustava web scraper -palvelu eri verkkosivustotyypeille. Palvelu tukee WordPress-verkkokauppoja, custom verkkokauppoja sekä yrityssivuja.

## Ominaisuudet

- **Moodipohjainen arkkitehtuuri**: Eri sivustotyypeille omat moodit (WordPress, custom e-commerce, company)
- **Automaattinen mooditunnistus**: Tunnistaa automaattisesti sivustotyypin
- **Sitemap-tuki**: Hyödyntää sitemapeja tehokkaaseen scrapingiin
- **Mukautettavat konfiguraatiot**: Helppo lisätä uusia selectoreita ja käytänteitä JSON-tiedostoihin
- **REST API**: Yksinkertainen JSON-pohjainen API

## Asennus

### Paikallinen kehitys

1. Asenna riippuvuudet:
```bash
npm install
```

2. Käynnistä palvelu:
```bash
npm start
```

Tai kehitysmoodissa (automaattinen uudelleenkäynnistys):
```bash
npm run dev
```

Palvelu käynnistyy oletuksena porttiin 3000.

## Käyttö

### API Endpoint

**POST** `/scrape`

**Request Body**:
```json
{
  "url": "https://example.com",
  "mode": "wordpress",  // optional: "wordpress", "custom-ecommerce", "company", "chatbot"
  "useSitemap": false   // optional: true/false (default: false)
}
```

**Response** (onnistunut):
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
        "availability_normalized": "in_stock",
        "image": "https://example.com/image.jpg",
        "link": "https://example.com/product"
      }
    ],
    "title": "Page Title",
    "description": "Page description"
  },
  "metadata": {
    "mode": "wordpress",
    "url": "https://example.com",
    "sitemapUsed": true,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

**Response** (virhe):
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Esimerkkejä

#### WordPress-verkkokauppa (perushaku, ei sitemappia)
```bash
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example-shop.com", "mode": "wordpress"}'
```

#### WordPress-verkkokauppa (sitemap-tiedot mukaan)
```bash
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example-shop.com", "mode": "wordpress", "useSitemap": true}'
```

#### Custom verkkokauppa (automaattinen tunnistus)
```bash
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://custom-shop.com"}'
```

#### Yrityssivut
```bash
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://company.com", "mode": "company"}'
```

#### Chatbot-moodi (sisältöteksti, logot, värit)
```bash
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "mode": "chatbot"}'
```

**Chatbot-moodin vastaus**:
```json
{
  "success": true,
  "data": {
    "title": "Page Title",
    "content": "Raw HTML content",
    "content_text": "Cleaned text content...",
    "logos": [
      {
        "src": "https://example.com/logo.png",
        "alt": "Company Logo",
        "width": 200,
        "height": 50
      }
    ],
    "colors": [
      {
        "hex": "#ff0000",
        "rgb": "rgb(255, 0, 0)",
        "type": "background",
        "element": "header",
        "className": "site-header"
      }
    ]
  }
}
```

## Moodikonfiguraatiot

Moodit määritellään JSON-tiedostoissa `src/config/` hakemistossa. Voit mukauttaa selectoreita ja lisätä uusia kenttiä.

### Uuden moodin lisääminen

1. Luo uusi moodiluokka `src/modes/` hakemistoon
2. Luo konfiguraatiotiedosto `src/config/` hakemistoon
3. Lisää moodi `src/core/scraper.js` tiedostoon

### Konfiguraatiotiedoston rakenne

```json
{
  "name": "moodin-nimi",
  "detection": {
    "selectors": ["CSS-selectorit tunnistamiseen"],
    "patterns": ["merkkijonot tunnistamiseen"]
  },
  "sitemap": {
    "enabled": true,
    "priority": true
  },
  "selectors": {
    "products": {
      "container": ".product",
      "title": "h2",
      "price": ".price",
      "availability": ".stock"
    }
  }
}
```

## Google Cloud Run -deployment

### Docker-kuvan rakentaminen

```bash
docker build -t web-scraper-service .
```

### Paikallinen testaus Dockerissa

```bash
docker run -p 8080:8080 -e PORT=8080 web-scraper-service
```

### Cloud Run -deployment

#### Vaihtoehto 1: Käytä deployment-skriptiä

```bash
chmod +x cloud-run-deploy.sh
./cloud-run-deploy.sh YOUR-PROJECT-ID web-scraper-service
```

#### Vaihtoehto 2: Manuaalinen deployment

1. Pushaa kuva Google Container Registryyn:
```bash
docker build -t gcr.io/YOUR-PROJECT-ID/web-scraper-service .
docker push gcr.io/YOUR-PROJECT-ID/web-scraper-service
```

Tai käytä Cloud Build:
```bash
gcloud builds submit --tag gcr.io/YOUR-PROJECT-ID/web-scraper-service
```

2. Deployaa Cloud Runiin (ilman min-instances - maksat vain käytöstä):
```bash
gcloud run deploy web-scraper-service \
  --image gcr.io/YOUR-PROJECT-ID/web-scraper-service \
  --platform managed \
  --region europe-north1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --concurrency 10 \
  --port 8080
```

### Cloud Run -asetukset selitettynä

- `--memory 2Gi`: Puppeteer/Chromium tarvitsee muistia (vähintään 2GB)
- `--cpu 2`: Parempi suorituskyky scrapingille
- `--timeout 300`: Scraping voi kestää (5 minuuttia maksimi)
- `--max-instances 10`: Rajoittaa samanaikaisten instanssien määrää (kustannukset)
- `--concurrency 10`: Monta requestia samanaikaisesti samassa instanssissa
- `--port 8080`: Cloud Run käyttää PORT ympäristömuuttujaa (8080 oletus)

**Huom**: Ei käytetä `--min-instances` - maksat vain käytöstä, mutta ensimmäinen request (cold start) voi kestää 10-30 sekuntia.

### Cold Start -huomio

Ilman `--min-instances`, ensimmäinen request kestää pidempään (cold start):
- Container käynnistyy: ~5-10 sekuntia
- Puppeteer + Chromium lataus: ~10-20 sekuntia
- **Yhteensä: ~15-30 sekuntia ensimmäiselle requestille**

Seuraavat requestit samassa instanssissa ovat nopeita (~2-5 sekuntia).

Jos haluat välttää cold starteja, lisää `--min-instances 1` (maksaa ~$10-20/kk).

## Health Check

Palvelu tarjoaa health check -endpointin:

**GET** `/health`

```json
{
  "status": "ok",
  "service": "web-scraper-service"
}
```

## Sitemap-tuki

Sitemap-tuki on **opt-in** -ominaisuus. Oletuksena scraper ei käytä sitemappia, vaan scrapeaa suoraan annetun URL:n sisällön.

Lisätietoja sitemap-tuesta: [SITEMAP.md](SITEMAP.md)

## Teknologiat

- **Node.js 18+**
- **Express.js** - REST API framework
- **Puppeteer** - Headless Chrome scraping
- **Custom sitemap parser** - Sitemap-parsinta (ei ulkoista kirjastoa)

## Rakenne

```
scraper/
├── src/
│   ├── api/routes/       # API-reitit
│   ├── core/             # Scraper engine, browser, sitemap
│   ├── modes/            # Moodiluokat
│   ├── config/           # Moodikonfiguraatiot (JSON)
│   └── utils/            # Apufunktiot
├── Dockerfile            # Cloud Run container
└── package.json
```

## Kehitys

Palvelu tukee automaattista uudelleenkäynnistystä kehitysmoodissa:

```bash
npm run dev
```

## Lisenssi

MIT

