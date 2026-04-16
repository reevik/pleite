# Pleite — Portfolio Manager

A full-stack investment portfolio tracker built with **Spring Boot** and **React**, featuring live market data from Yahoo Finance, PDF statement import, and a polished dark UI inspired by Parqet.

![Stack](https://img.shields.io/badge/Spring_Boot-3.2-green?style=flat-square) ![React](https://img.shields.io/badge/React-18-blue?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-gray?style=flat-square)

---

<img width="1884" height="1012" alt="Screenshot 2026-04-16 at 09 46 09" src="https://github.com/user-attachments/assets/7033a255-33bf-4a74-a42f-3671c05df7cf" />


## Features

- **Dashboard** — Total portfolio value, return, day change, allocation charts
- **Live Prices** — Real-time stock/ETF/crypto quotes via Yahoo Finance API
- **Ticker Search** — Autocomplete search across global markets
- **Manual Entry** — Add investments via form with ticker search integration
- **PDF Import** — Upload brokerage statements, auto-parse transactions
- **Position Management** — Edit, delete, sort holdings
- **Asset Allocation** — Pie charts by asset type and by position weight
- **Market Lookup** — Standalone quote lookup with detailed stats
- **Auto-refresh** — Quotes update every 60 seconds
- **Responsive** — Works on desktop, tablet, and mobile

---

## Tech Stack

### Backend
- **Spring Boot 3.2** with Spring Web, Spring Data JPA, WebFlux
- **H2 Database** (file-based, persists between restarts)
- **Apache PDFBox 3** for PDF text extraction
- **Yahoo Finance API** (unofficial v8 chart endpoint, no API key needed)

### Frontend
- **React 18** with Hooks
- **Vite** for fast dev/build
- **Recharts** for charts
- **Lucide React** for icons
- Custom CSS design system (no framework dependency)

---

## Prerequisites

- **Java 17+** (JDK)
- **Maven 3.8+**
- **Node.js 18+** and npm

---

## Quick Start

### 1. Start the Backend

```bash
cd portfolio-manager

# Build and run
./mvnw spring-boot:run
# or: mvn spring-boot:run
```

The backend starts on **http://localhost:8080**.

- H2 Console: http://localhost:8080/h2-console (JDBC URL: `jdbc:h2:file:./data/portfolio`)
- API docs are at `/api/investments`, `/api/market`, `/api/pdf`

### 2. Start the Frontend

```bash
cd portfolio-manager/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The frontend starts on **http://localhost:5173** and proxies API calls to the backend.

### 3. Build for Production

```bash
cd frontend
npm run build
```

This outputs the React build into `src/main/resources/static/`, so the Spring Boot app serves both API and frontend from a single JAR:

```bash
cd ..
./mvnw package
java -jar target/portfolio-manager-1.0.0.jar
```

---

## API Endpoints

### Investments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/investments` | List all investments |
| GET | `/api/investments/{id}` | Get single investment |
| POST | `/api/investments` | Create investment |
| POST | `/api/investments/batch` | Create multiple investments |
| PUT | `/api/investments/{id}` | Update investment |
| DELETE | `/api/investments/{id}` | Delete investment |
| GET | `/api/investments/summary` | Portfolio summary with live prices |

### Market Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/market/quote/{ticker}` | Live quote for a ticker |
| GET | `/api/market/quotes?tickers=X,Y` | Multiple quotes |
| GET | `/api/market/search?q=apple` | Search tickers by name |

### PDF Import
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/pdf/parse` | Upload and parse PDF (multipart) |

---

## Project Structure

```
portfolio-manager/
├── pom.xml
├── src/main/java/com/portfolio/
│   ├── PortfolioApplication.java      # Entry point
│   ├── config/WebConfig.java          # CORS & routing
│   ├── controller/
│   │   ├── InvestmentController.java  # CRUD + summary
│   │   ├── MarketDataController.java  # Live quotes
│   │   └── PdfUploadController.java   # PDF parsing
│   ├── dto/                           # Data transfer objects
│   ├── model/Investment.java          # JPA entity
│   ├── repository/                    # Spring Data repos
│   └── service/
│       ├── InvestmentService.java     # Business logic
│       ├── MarketDataService.java     # Yahoo Finance client
│       └── PdfParserService.java      # PDF text extraction
├── src/main/resources/
│   └── application.yml                # Configuration
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx                    # Main app shell
        ├── index.css                  # Design system
        ├── services/api.js            # API client
        ├── hooks/usePortfolio.js       # Custom hooks
        └── components/
            ├── StatsCards.jsx          # Portfolio KPIs
            ├── PositionsTable.jsx      # Holdings table
            ├── AllocationChart.jsx     # Pie charts
            ├── InvestmentModal.jsx     # Add/edit form
            ├── PdfUpload.jsx           # PDF import
            └── MarketLookup.jsx        # Quote search
```

---

## Configuration

Edit `src/main/resources/application.yml`:

```yaml
# Change port
server:
  port: 8080

# Use PostgreSQL instead of H2
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/portfolio
    driver-class-name: org.postgresql.Driver
    username: postgres
    password: secret
  jpa:
    hibernate:
      ddl-auto: update
```

---

## PDF Import Notes

The PDF parser supports common brokerage statement formats:
- **Transaction patterns**: `BUY 10 AAPL @ 150.00 2024-01-15`
- **German brokers**: `KAUF 5 DE000ETF1234 zu 45,50 EUR`
- **Tabular formats**: ISIN/Ticker | Name | Quantity | Price

For unsupported formats, the raw extracted text is shown so you can manually enter the data. The parser is extensible — add new regex patterns in `PdfParserService.java`.

---

## Extending

- **Add a new broker PDF format**: Add regex patterns in `PdfParserService.java`
- **Switch to a different market API**: Modify `MarketDataService.java` (Alpha Vantage, Twelve Data, etc.)
- **Add authentication**: Spring Security + JWT
- **Add PostgreSQL**: Update `application.yml` and add the PostgreSQL driver dependency
- **Historical performance chart**: Store daily snapshots and add a `/api/investments/history` endpoint

---

## License

MIT
