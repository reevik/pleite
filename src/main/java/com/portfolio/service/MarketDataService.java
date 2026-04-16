package com.portfolio.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.portfolio.dto.AssetProfileDto;
import com.portfolio.dto.EtfHoldingsDto;
import com.portfolio.dto.MarketQuoteDto;
import com.portfolio.model.StockProfile;
import com.portfolio.repository.StockProfileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.HttpCookie;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class MarketDataService {

    private static final Logger log = LoggerFactory.getLogger(MarketDataService.class);

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final StockProfileRepository stockProfileRepository;

    /** How long a DB-cached profile is considered fresh before re-fetching from Yahoo. */
    private static final Duration DB_PROFILE_TTL = Duration.ofDays(30);

    // In-memory caches for quotes and ETF holdings (short-lived)
    private final Map<String, CachedQuote> cache = new ConcurrentHashMap<>();
    private final Map<String, CachedEtfHoldings> etfHoldingsCache = new ConcurrentHashMap<>();
    private static final Duration CACHE_TTL = Duration.ofMinutes(1);
    private static final Duration ETF_HOLDINGS_CACHE_TTL = Duration.ofHours(24);

    private record CachedQuote(MarketQuoteDto quote, Instant fetchedAt) {
        boolean isExpired() {
            return Instant.now().isAfter(fetchedAt.plus(CACHE_TTL));
        }
    }

    private record CachedEtfHoldings(EtfHoldingsDto holdings, Instant fetchedAt) {
        boolean isExpired() {
            return Instant.now().isAfter(fetchedAt.plus(ETF_HOLDINGS_CACHE_TTL));
        }
    }

    // Crumb auth for quoteSummary endpoints
    private final WebClient authClient;
    private final AtomicReference<YahooCrumb> crumbRef = new AtomicReference<>();
    private static final Duration CRUMB_TTL = Duration.ofHours(1);

    private record YahooCrumb(String crumb, String cookie, Instant fetchedAt) {
        boolean isExpired() {
            return Instant.now().isAfter(fetchedAt.plus(CRUMB_TTL));
        }
    }

    public MarketDataService(WebClient.Builder webClientBuilder, ObjectMapper objectMapper,
                             StockProfileRepository stockProfileRepository) {
        this.webClient = webClientBuilder
                .baseUrl("https://query1.finance.yahoo.com")
                .defaultHeader("User-Agent", "Mozilla/5.0")
                .build();
        this.authClient = WebClient.builder()
                .defaultHeader("User-Agent", "Mozilla/5.0")
                .build();
        this.objectMapper = objectMapper;
        this.stockProfileRepository = stockProfileRepository;
    }

    private YahooCrumb getOrRefreshCrumb() {
        YahooCrumb current = crumbRef.get();
        if (current != null && !current.isExpired()) {
            return current;
        }

        try {
            // Step 1: Hit fc.yahoo.com to get cookies
            var cookieResponse = authClient.get()
                    .uri("https://fc.yahoo.com/")
                    .exchangeToMono(response -> {
                        List<String> setCookies = response.headers().header("Set-Cookie");
                        return response.bodyToMono(String.class)
                                .defaultIfEmpty("")
                                .map(body -> setCookies);
                    })
                    .timeout(Duration.ofSeconds(10))
                    .block();

            // Extract cookie values
            StringBuilder cookieHeader = new StringBuilder();
            if (cookieResponse != null) {
                for (String sc : cookieResponse) {
                    try {
                        List<HttpCookie> parsed = HttpCookie.parse(sc);
                        for (HttpCookie c : parsed) {
                            if (cookieHeader.length() > 0) cookieHeader.append("; ");
                            cookieHeader.append(c.getName()).append("=").append(c.getValue());
                        }
                    } catch (Exception ignored) {}
                }
            }

            String cookies = cookieHeader.toString();

            // Step 2: Get crumb
            String crumb = authClient.get()
                    .uri("https://query2.finance.yahoo.com/v1/test/getcrumb")
                    .header("Cookie", cookies)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            if (crumb != null && !crumb.isBlank()) {
                YahooCrumb newCrumb = new YahooCrumb(crumb.trim(), cookies, Instant.now());
                crumbRef.set(newCrumb);
                log.info("Refreshed Yahoo Finance crumb");
                return newCrumb;
            }
        } catch (Exception e) {
            log.warn("Failed to refresh Yahoo Finance crumb: {}", e.getMessage());
        }
        return current; // return stale crumb as fallback
    }

    /**
     * Fetch a live quote for a single ticker via Yahoo Finance v8 chart API.
     */
    public MarketQuoteDto getQuote(String ticker) {
        // Check cache
        CachedQuote cached = cache.get(ticker.toUpperCase());
        if (cached != null && !cached.isExpired()) {
            return cached.quote();
        }

        try {
            String response = webClient.get()
                    .uri("/v8/finance/chart/{ticker}?interval=1d&range=2d", ticker)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            MarketQuoteDto quote = parseChartResponse(ticker, response);
            if (quote != null) {
                cache.put(ticker.toUpperCase(), new CachedQuote(quote, Instant.now()));
            }
            return quote;

        } catch (Exception e) {
            log.warn("Failed to fetch quote for {}: {}", ticker, e.getMessage());
            // Return cached even if expired, as fallback
            if (cached != null) return cached.quote();
            return null;
        }
    }

    /**
     * Fetch quotes for multiple tickers.
     */
    public Map<String, MarketQuoteDto> getQuotes(List<String> tickers) {
        Map<String, MarketQuoteDto> result = new LinkedHashMap<>();
        for (String ticker : tickers) {
            MarketQuoteDto quote = getQuote(ticker);
            if (quote != null) {
                result.put(ticker.toUpperCase(), quote);
            }
        }
        return result;
    }

    /**
     * Search for tickers/securities by keyword.
     */
    public List<Map<String, String>> searchTickers(String query) {
        try {
            String response = webClient.get()
                    .uri("/v1/finance/search?q={query}&quotesCount=8&newsCount=0", query)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            JsonNode root = objectMapper.readTree(response);
            JsonNode quotes = root.path("quotes");
            List<Map<String, String>> results = new ArrayList<>();

            if (quotes.isArray()) {
                for (JsonNode q : quotes) {
                    Map<String, String> item = new HashMap<>();
                    item.put("symbol", q.path("symbol").asText());
                    item.put("name", q.path("shortname").asText(q.path("longname").asText("")));
                    item.put("type", q.path("quoteType").asText());
                    item.put("exchange", q.path("exchange").asText());
                    results.add(item);
                }
            }
            return results;

        } catch (Exception e) {
            log.warn("Ticker search failed for '{}': {}", query, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Fetch asset profile (country, sector, industry) via Yahoo Finance quoteSummary API.
     * Requires crumb + cookie authentication.
     */
    public AssetProfileDto getAssetProfile(String ticker) {
        String key = ticker.toUpperCase();

        // 1. Check database cache
        StockProfile dbProfile = stockProfileRepository.findById(key).orElse(null);
        if (dbProfile != null && dbProfile.getUpdatedAt() != null) {
            boolean fresh = dbProfile.getUpdatedAt()
                    .isAfter(LocalDateTime.now().minus(DB_PROFILE_TTL));
            boolean hasData = (dbProfile.getCountry() != null && !dbProfile.getCountry().isBlank())
                    || (dbProfile.getSector() != null && !dbProfile.getSector().isBlank());
            if (fresh && hasData) {
                return toDto(dbProfile);
            }
        }

        // 2. Fetch from Yahoo Finance
        AssetProfileDto fetched = fetchProfileFromYahoo(key);

        // 3. Persist to DB
        if (fetched != null) {
            saveToDb(key, fetched, null);
        }

        return fetched;
    }

    /** Fetch profile from Yahoo's quoteSummary API (requires crumb auth). */
    private AssetProfileDto fetchProfileFromYahoo(String ticker) {
        try {
            YahooCrumb yahooCrumb = getOrRefreshCrumb();
            if (yahooCrumb == null || yahooCrumb.crumb() == null) {
                log.warn("No Yahoo crumb available for profile fetch of {}", ticker);
                return null;
            }

            String response = authClient.get()
                    .uri("https://query2.finance.yahoo.com/v10/finance/quoteSummary/{ticker}?modules=assetProfile&crumb={crumb}",
                            ticker, yahooCrumb.crumb())
                    .header("Cookie", yahooCrumb.cookie())
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            return parseAssetProfile(ticker, response);

        } catch (Exception e) {
            log.warn("Failed to fetch asset profile for {}: {}", ticker, e.getMessage());
            crumbRef.set(null);
            return null;
        }
    }

    /** Convert DB entity to DTO. */
    private AssetProfileDto toDto(StockProfile sp) {
        AssetProfileDto dto = new AssetProfileDto();
        dto.setTicker(sp.getTicker());
        dto.setCountry(sp.getCountry());
        dto.setRegion(sp.getRegion());
        dto.setSector(sp.getSector());
        dto.setIndustry(sp.getIndustry());
        return dto;
    }

    /** Upsert profile data into the stock_profiles table using JDBC merge to avoid race conditions. */
    private void saveToDb(String ticker, AssetProfileDto dto, String exchange) {
        try {
            upsertStockProfile(ticker, dto.getCountry(), dto.getRegion(),
                    dto.getSector(), dto.getIndustry(), exchange);
        } catch (Exception e) {
            log.debug("Could not persist stock profile for {}: {}", ticker, e.getMessage());
        }
    }

    /** Save profile data inferred from exchange name (fallback). */
    public void saveExchangeProfile(String ticker, String country, String region, String exchange) {
        try {
            upsertStockProfile(ticker.toUpperCase(), country, region, null, null, exchange);
        } catch (Exception e) {
            log.debug("Could not persist exchange profile for {}: {}", ticker, e.getMessage());
        }
    }

    /** Atomic upsert using SQL MERGE to avoid primary key violations from concurrent inserts. */
    private void upsertStockProfile(String ticker, String country, String region,
                                     String sector, String industry, String exchange) {
        stockProfileRepository.upsert(ticker, country, region, sector, industry, exchange);
    }

    /**
     * Fetch asset profiles for multiple tickers.
     */
    public Map<String, AssetProfileDto> getAssetProfiles(List<String> tickers) {
        Map<String, AssetProfileDto> result = new LinkedHashMap<>();
        for (String ticker : tickers) {
            AssetProfileDto profile = getAssetProfile(ticker);
            if (profile != null) {
                result.put(ticker.toUpperCase(), profile);
            }
        }
        return result;
    }

    /**
     * Fetch stock fundamentals (P/E, EPS, market cap, analyst ratings, margins, etc.)
     * via Yahoo Finance summaryDetail + financialData modules.
     */
    public Map<String, Object> getFundamentals(String ticker) {
        try {
            YahooCrumb yahooCrumb = getOrRefreshCrumb();
            if (yahooCrumb == null || yahooCrumb.crumb() == null) return null;

            String response = authClient.get()
                    .uri("https://query2.finance.yahoo.com/v10/finance/quoteSummary/{ticker}?modules=summaryDetail,financialData,defaultKeyStatistics,recommendationTrend,upgradeDowngradeHistory,earningsHistory,earningsTrend,calendarEvents&crumb={crumb}",
                            ticker, yahooCrumb.crumb())
                    .header("Cookie", yahooCrumb.cookie())
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            return parseFundamentals(ticker, response);
        } catch (Exception e) {
            log.warn("Failed to fetch fundamentals for {}: {}", ticker, e.getMessage());
            crumbRef.set(null);
            return null;
        }
    }

    private Map<String, Object> parseFundamentals(String ticker, String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode results = root.path("quoteSummary").path("result");
            if (!results.isArray() || results.isEmpty()) return null;

            JsonNode result = results.get(0);
            JsonNode sd = result.path("summaryDetail");
            JsonNode fd = result.path("financialData");
            JsonNode ks = result.path("defaultKeyStatistics");

            Map<String, Object> f = new LinkedHashMap<>();
            f.put("ticker", ticker.toUpperCase());

            // Valuation
            f.put("trailingPE", rawDouble(sd, "trailingPE"));
            f.put("forwardPE", rawDouble(sd, "forwardPE"));
            f.put("pegRatio", rawDouble(ks, "pegRatio"));
            f.put("priceToBook", rawDouble(ks, "priceToBook"));
            f.put("enterpriseToEbitda", rawDouble(ks, "enterpriseToEbitda"));
            f.put("enterpriseToRevenue", rawDouble(ks, "enterpriseToRevenue"));

            // Per-share
            f.put("trailingEps", rawDouble(ks, "trailingEps"));
            f.put("forwardEps", rawDouble(ks, "forwardEps"));
            f.put("bookValue", rawDouble(ks, "bookValue"));
            f.put("revenuePerShare", rawDouble(fd, "revenuePerShare"));

            // Market
            f.put("marketCap", rawDouble(sd, "marketCap"));
            f.put("enterpriseValue", rawDouble(ks, "enterpriseValue"));
            f.put("beta", rawDouble(sd, "beta"));
            f.put("fiftyTwoWeekHigh", rawDouble(sd, "fiftyTwoWeekHigh"));
            f.put("fiftyTwoWeekLow", rawDouble(sd, "fiftyTwoWeekLow"));
            f.put("fiftyDayAverage", rawDouble(sd, "fiftyDayAverage"));
            f.put("twoHundredDayAverage", rawDouble(sd, "twoHundredDayAverage"));
            f.put("volume", rawDouble(sd, "volume"));
            f.put("averageVolume", rawDouble(sd, "averageVolume"));

            // Dividends
            f.put("dividendYield", rawDouble(sd, "dividendYield"));
            f.put("dividendRate", rawDouble(sd, "dividendRate"));
            f.put("payoutRatio", rawDouble(sd, "payoutRatio"));
            f.put("exDividendDate", fmtStr(sd, "exDividendDate"));

            // Profitability
            f.put("profitMargins", rawDouble(fd, "profitMargins"));
            f.put("grossMargins", rawDouble(fd, "grossMargins"));
            f.put("operatingMargins", rawDouble(fd, "operatingMargins"));
            f.put("returnOnEquity", rawDouble(fd, "returnOnEquity"));
            f.put("returnOnAssets", rawDouble(fd, "returnOnAssets"));

            // Growth
            f.put("revenueGrowth", rawDouble(fd, "revenueGrowth"));
            f.put("earningsGrowth", rawDouble(fd, "earningsGrowth"));

            // Financials
            f.put("totalRevenue", rawDouble(fd, "totalRevenue"));
            f.put("ebitda", rawDouble(fd, "ebitda"));
            f.put("freeCashflow", rawDouble(fd, "freeCashflow"));
            f.put("operatingCashflow", rawDouble(fd, "operatingCashflow"));
            f.put("debtToEquity", rawDouble(fd, "debtToEquity"));
            f.put("currentRatio", rawDouble(fd, "currentRatio"));

            // Key stats
            f.put("sharesOutstanding", rawDouble(ks, "sharesOutstanding"));
            f.put("floatShares", rawDouble(ks, "floatShares"));
            f.put("shortRatio", rawDouble(ks, "shortRatio"));

            // Analyst ratings
            f.put("recommendationKey", fd.path("recommendationKey").asText(null));
            f.put("recommendationMean", rawDouble(fd, "recommendationMean"));
            f.put("numberOfAnalystOpinions", rawDouble(fd, "numberOfAnalystOpinions"));
            f.put("targetMeanPrice", rawDouble(fd, "targetMeanPrice"));
            f.put("targetMedianPrice", rawDouble(fd, "targetMedianPrice"));
            f.put("targetHighPrice", rawDouble(fd, "targetHighPrice"));
            f.put("targetLowPrice", rawDouble(fd, "targetLowPrice"));

            // Recommendation trend (monthly breakdown: strongBuy, buy, hold, sell, strongSell)
            JsonNode recTrend = result.path("recommendationTrend").path("trend");
            if (recTrend.isArray() && !recTrend.isEmpty()) {
                List<Map<String, Object>> trendList = new ArrayList<>();
                for (JsonNode period : recTrend) {
                    Map<String, Object> p = new LinkedHashMap<>();
                    p.put("period", period.path("period").asText());
                    p.put("strongBuy", period.path("strongBuy").asInt(0));
                    p.put("buy", period.path("buy").asInt(0));
                    p.put("hold", period.path("hold").asInt(0));
                    p.put("sell", period.path("sell").asInt(0));
                    p.put("strongSell", period.path("strongSell").asInt(0));
                    trendList.add(p);
                }
                f.put("recommendationTrend", trendList);
            }

            // Upgrade / Downgrade history (latest entries)
            JsonNode udHistory = result.path("upgradeDowngradeHistory").path("history");
            if (udHistory.isArray() && !udHistory.isEmpty()) {
                List<Map<String, Object>> historyList = new ArrayList<>();
                int limit = Math.min(udHistory.size(), 10); // last 10 ratings
                for (int i = 0; i < limit; i++) {
                    JsonNode entry = udHistory.get(i);
                    Map<String, Object> h = new LinkedHashMap<>();
                    long epochGravity = entry.path("epochGradeDate").asLong(0);
                    if (epochGravity > 0) {
                        h.put("date", epochGravity);
                    }
                    h.put("firm", entry.path("firm").asText(null));
                    h.put("toGrade", entry.path("toGrade").asText(null));
                    h.put("fromGrade", entry.path("fromGrade").asText(null));
                    h.put("action", entry.path("action").asText(null));
                    historyList.add(h);
                }
                f.put("upgradeDowngradeHistory", historyList);
            }

            // Earnings history (past quarters: actual vs estimate)
            JsonNode earningsHist = result.path("earningsHistory").path("history");
            List<Map<String, Object>> earningsQuarters = new ArrayList<>();
            if (earningsHist.isArray()) {
                for (JsonNode q : earningsHist) {
                    Map<String, Object> quarter = new LinkedHashMap<>();
                    long epochDate = q.path("quarter").path("raw").asLong(0);
                    if (epochDate > 0) {
                        quarter.put("quarterEpoch", epochDate);
                        quarter.put("quarterLabel", q.path("quarter").path("fmt").asText(""));
                    }
                    quarter.put("period", q.path("period").asText(null));
                    Double actual = rawDouble(q, "epsActual");
                    Double estimate = rawDouble(q, "epsEstimate");
                    Double diff = rawDouble(q, "epsDifference");
                    Double surprise = rawDouble(q, "surprisePercent");
                    quarter.put("epsActual", actual);
                    quarter.put("epsEstimate", estimate);
                    quarter.put("epsDifference", diff);
                    quarter.put("surprisePercent", surprise);
                    quarter.put("type", "reported");
                    earningsQuarters.add(quarter);
                }
            }

            // Earnings trend (current + future quarter estimates)
            JsonNode earningsTrend = result.path("earningsTrend").path("trend");
            if (earningsTrend.isArray()) {
                for (JsonNode t : earningsTrend) {
                    String period = t.path("period").asText("");
                    // Only include quarter estimates (0q, +1q), not annual
                    if (!period.endsWith("q")) continue;
                    Map<String, Object> quarter = new LinkedHashMap<>();
                    quarter.put("period", period);
                    String endDate = t.path("endDate").asText(null);
                    quarter.put("endDate", endDate);

                    JsonNode earningsEst = t.path("earningsEstimate");
                    Double avg = rawDouble(earningsEst, "avg");
                    Double low = rawDouble(earningsEst, "low");
                    Double high = rawDouble(earningsEst, "high");
                    Double growth = rawDouble(earningsEst, "growth");
                    quarter.put("epsEstimate", avg);
                    quarter.put("epsEstimateLow", low);
                    quarter.put("epsEstimateHigh", high);
                    quarter.put("earningsGrowth", growth);
                    quarter.put("numberOfAnalysts", earningsEst.path("numberOfAnalysts").path("raw").asInt(0));
                    quarter.put("type", "estimate");
                    earningsQuarters.add(quarter);
                }
            }

            // Next earnings date from calendarEvents
            JsonNode calEvents = result.path("calendarEvents").path("earnings");
            if (!calEvents.isMissingNode()) {
                JsonNode earningsDate = calEvents.path("earningsDate");
                if (earningsDate.isArray() && !earningsDate.isEmpty()) {
                    f.put("nextEarningsDate", earningsDate.get(0).path("fmt").asText(null));
                }
            }

            if (!earningsQuarters.isEmpty()) {
                f.put("earningsQuarters", earningsQuarters);
            }

            // Remove null entries
            f.values().removeIf(Objects::isNull);

            return f;
        } catch (Exception e) {
            log.error("Failed to parse fundamentals for {}: {}", ticker, e.getMessage());
            return null;
        }
    }

    /** Extract raw numeric value, or null */
    private Object rawVal(JsonNode parent, String field) {
        JsonNode n = parent.path(field);
        if (n.isMissingNode() || !n.has("raw")) return null;
        return n.get("raw").numberValue();
    }

    /** Extract raw double from Yahoo's { raw: ..., fmt: ... } object, or null */
    private Double rawDouble(JsonNode parent, String field) {
        JsonNode n = parent.path(field);
        if (n.isMissingNode() || !n.has("raw")) return null;
        double val = n.path("raw").asDouble(Double.NaN);
        return Double.isNaN(val) ? null : val;
    }

    /** Extract raw numeric, formatted to 2 decimals */
    private Object fmtVal(JsonNode parent, String field) {
        JsonNode n = parent.path(field);
        if (n.isMissingNode() || !n.has("raw")) return null;
        double raw = n.path("raw").asDouble();
        return Math.round(raw * 100.0) / 100.0;
    }

    /** Extract the pre-formatted string (e.g. "3.8T", "15.70%") */
    private String fmtStr(JsonNode parent, String field) {
        JsonNode n = parent.path(field);
        if (n.isMissingNode()) return null;
        String fmt = n.path("fmt").asText(null);
        if (fmt != null) return fmt;
        if (n.has("raw")) return String.valueOf(n.path("raw").asDouble());
        return null;
    }

    /**
     * Fetch ETF holdings breakdown (sector weightings + top holdings with country/region)
     * via Yahoo Finance topHoldings module.
     */
    public EtfHoldingsDto getEtfHoldings(String ticker) {
        String key = ticker.toUpperCase();
        CachedEtfHoldings cached = etfHoldingsCache.get(key);
        if (cached != null && !cached.isExpired()) {
            return cached.holdings();
        }

        try {
            YahooCrumb yahooCrumb = getOrRefreshCrumb();
            if (yahooCrumb == null || yahooCrumb.crumb() == null) {
                log.warn("No Yahoo crumb available for ETF holdings fetch of {}", ticker);
                return null;
            }

            String response = authClient.get()
                    .uri("https://query2.finance.yahoo.com/v10/finance/quoteSummary/{ticker}?modules=topHoldings&crumb={crumb}",
                            ticker, yahooCrumb.crumb())
                    .header("Cookie", yahooCrumb.cookie())
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(15))
                    .block();

            EtfHoldingsDto holdings = parseEtfHoldings(key, response);
            if (holdings != null) {
                etfHoldingsCache.put(key, new CachedEtfHoldings(holdings, Instant.now()));
            }
            return holdings;

        } catch (Exception e) {
            log.warn("Failed to fetch ETF holdings for {}: {}", ticker, e.getMessage());
            crumbRef.set(null);
            if (cached != null) return cached.holdings();
            return null;
        }
    }

    private EtfHoldingsDto parseEtfHoldings(String ticker, String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode results = root.path("quoteSummary").path("result");
            if (!results.isArray() || results.isEmpty()) return null;

            JsonNode topHoldings = results.get(0).path("topHoldings");
            if (topHoldings.isMissingNode()) return null;

            EtfHoldingsDto dto = new EtfHoldingsDto();
            dto.setTicker(ticker);

            // Parse sector weightings
            JsonNode sectorWeightings = topHoldings.path("sectorWeightings");
            Map<String, BigDecimal> sectors = new LinkedHashMap<>();
            if (sectorWeightings.isArray()) {
                for (JsonNode entry : sectorWeightings) {
                    // Each entry is an object like { "technology": { "raw": 0.3356 } }
                    var fields = entry.fields();
                    while (fields.hasNext()) {
                        var field = fields.next();
                        String sectorKey = field.getKey();
                        BigDecimal weight = BigDecimal.valueOf(field.getValue().path("raw").asDouble(0));
                        if (weight.compareTo(BigDecimal.ZERO) > 0) {
                            String displayName = EtfHoldingsDto.normalizeSectorKey(sectorKey);
                            sectors.put(displayName, weight);
                        }
                    }
                }
            }
            dto.setSectorWeightings(sectors);

            // Parse top holdings and resolve their country/region via assetProfile
            JsonNode holdingsNode = topHoldings.path("holdings");
            List<EtfHoldingsDto.Holding> holdings = new ArrayList<>();
            BigDecimal totalCoverage = BigDecimal.ZERO;

            if (holdingsNode.isArray()) {
                for (JsonNode h : holdingsNode) {
                    String symbol = h.path("symbol").asText(null);
                    String name = h.path("holdingName").asText("");
                    BigDecimal weight = BigDecimal.valueOf(h.path("holdingPercent").path("raw").asDouble(0));

                    if (symbol == null || symbol.isBlank() || weight.compareTo(BigDecimal.ZERO) <= 0) continue;

                    // Look up country/region for each holding
                    String country = null;
                    String region = null;
                    try {
                        AssetProfileDto profile = getAssetProfile(symbol);
                        if (profile != null) {
                            country = profile.getCountry();
                            region = profile.getRegion();
                        }
                    } catch (Exception e) {
                        log.debug("Could not resolve profile for ETF holding {}: {}", symbol, e.getMessage());
                    }

                    holdings.add(new EtfHoldingsDto.Holding(symbol, name, weight, country, region));
                    totalCoverage = totalCoverage.add(weight);
                }
            }
            dto.setHoldings(holdings);
            dto.setHoldingsCoverage(totalCoverage);

            return dto;
        } catch (Exception e) {
            log.error("Failed to parse ETF holdings for {}: {}", ticker, e.getMessage());
            return null;
        }
    }

    private AssetProfileDto parseAssetProfile(String ticker, String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode results = root.path("quoteSummary").path("result");
            if (!results.isArray() || results.isEmpty()) return null;

            JsonNode assetProfile = results.get(0).path("assetProfile");
            if (assetProfile.isMissingNode()) return null;

            AssetProfileDto dto = new AssetProfileDto();
            dto.setTicker(ticker);

            String country = assetProfile.path("country").asText(null);
            dto.setCountry(country);
            dto.setRegion(AssetProfileDto.regionForCountry(country));
            dto.setSector(assetProfile.path("sector").asText(null));
            dto.setIndustry(assetProfile.path("industry").asText(null));

            return dto;
        } catch (Exception e) {
            log.error("Failed to parse asset profile for {}: {}", ticker, e.getMessage());
            return null;
        }
    }

    /**
     * Fetch historical chart data for a ticker.
     * @param range e.g. "1d", "5d", "1mo", "3mo", "6mo", "1y", "5y", "max"
     * @param interval e.g. "5m", "15m", "1h", "1d", "1wk"
     */
    public Map<String, Object> getChartData(String ticker, String range, String interval) {
        try {
            String response = webClient.get()
                    .uri("/v8/finance/chart/{ticker}?interval={interval}&range={range}",
                            ticker, interval, range)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            return parseChartDataResponse(ticker, response);
        } catch (Exception e) {
            log.warn("Failed to fetch chart data for {} (range={}, interval={}): {}",
                    ticker, range, interval, e.getMessage());
            return null;
        }
    }

    private Map<String, Object> parseChartDataResponse(String ticker, String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode result = root.path("chart").path("result");
            if (!result.isArray() || result.isEmpty()) return null;

            JsonNode chartData = result.get(0);
            JsonNode meta = chartData.path("meta");
            JsonNode timestamps = chartData.path("timestamp");
            JsonNode quoteData = chartData.path("indicators").path("quote");

            if (!timestamps.isArray() || timestamps.isEmpty() || !quoteData.isArray() || quoteData.isEmpty()) return null;

            JsonNode quotes = quoteData.get(0);
            JsonNode closes = quotes.path("close");
            JsonNode opens = quotes.path("open");
            JsonNode highs = quotes.path("high");
            JsonNode lows = quotes.path("low");
            JsonNode volumes = quotes.path("volume");

            List<Map<String, Object>> points = new ArrayList<>();
            for (int i = 0; i < timestamps.size(); i++) {
                if (closes.get(i).isNull()) continue;
                Map<String, Object> point = new LinkedHashMap<>();
                point.put("timestamp", timestamps.get(i).asLong());
                point.put("close", closes.get(i).asDouble());
                if (!opens.get(i).isNull()) point.put("open", opens.get(i).asDouble());
                if (!highs.get(i).isNull()) point.put("high", highs.get(i).asDouble());
                if (!lows.get(i).isNull()) point.put("low", lows.get(i).asDouble());
                if (!volumes.get(i).isNull()) point.put("volume", volumes.get(i).asLong());
                points.add(point);
            }

            Map<String, Object> result2 = new LinkedHashMap<>();
            result2.put("ticker", ticker.toUpperCase());
            result2.put("currency", meta.path("currency").asText("USD"));
            result2.put("exchangeName", meta.path("exchangeName").asText(""));
            result2.put("previousClose", meta.path("chartPreviousClose").asDouble(0));
            result2.put("regularMarketPrice", meta.path("regularMarketPrice").asDouble(0));
            result2.put("regularMarketTime", meta.path("regularMarketTime").asLong(0));
            result2.put("points", points);

            // Pre/post-market extended hours data
            if (meta.has("postMarketPrice") && !meta.path("postMarketPrice").isNull()) {
                result2.put("postMarketPrice", meta.path("postMarketPrice").asDouble());
                result2.put("postMarketChange", meta.path("postMarketChange").asDouble(0));
                result2.put("postMarketChangePercent", meta.path("postMarketChangePercent").asDouble(0));
                if (meta.has("postMarketTime"))
                    result2.put("postMarketTime", meta.path("postMarketTime").asLong());
            }
            if (meta.has("preMarketPrice") && !meta.path("preMarketPrice").isNull()) {
                result2.put("preMarketPrice", meta.path("preMarketPrice").asDouble());
                result2.put("preMarketChange", meta.path("preMarketChange").asDouble(0));
                result2.put("preMarketChangePercent", meta.path("preMarketChangePercent").asDouble(0));
                if (meta.has("preMarketTime"))
                    result2.put("preMarketTime", meta.path("preMarketTime").asLong());
            }

            return result2;
        } catch (Exception e) {
            log.error("Failed to parse chart data for {}: {}", ticker, e.getMessage());
            return null;
        }
    }

    private MarketQuoteDto parseChartResponse(String ticker, String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode result = root.path("chart").path("result");

            if (!result.isArray() || result.isEmpty()) return null;

            JsonNode chartData = result.get(0);
            JsonNode meta = chartData.path("meta");
            JsonNode indicators = chartData.path("indicators").path("quote");

            if (!indicators.isArray() || indicators.isEmpty()) return null;

            MarketQuoteDto dto = new MarketQuoteDto();
            dto.setTicker(ticker.toUpperCase());
            dto.setName(meta.path("shortName").asText(meta.path("symbol").asText(ticker)));
            dto.setCurrency(meta.path("currency").asText("USD"));
            dto.setExchange(meta.path("exchangeName").asText(""));

            BigDecimal currentPrice = BigDecimal.valueOf(meta.path("regularMarketPrice").asDouble());
            BigDecimal previousClose = BigDecimal.valueOf(meta.path("chartPreviousClose").asDouble(
                    meta.path("previousClose").asDouble(0)));

            dto.setPrice(currentPrice.setScale(4, RoundingMode.HALF_UP));
            dto.setPreviousClose(previousClose.setScale(4, RoundingMode.HALF_UP));

            if (previousClose.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal change = currentPrice.subtract(previousClose);
                dto.setDayChange(change.setScale(4, RoundingMode.HALF_UP));
                dto.setDayChangePercent(
                        change.divide(previousClose, 6, RoundingMode.HALF_UP)
                                .multiply(BigDecimal.valueOf(100))
                                .setScale(2, RoundingMode.HALF_UP)
                );
            }

            // Extract high/low/volume from latest quote data
            JsonNode quoteData = indicators.get(0);
            JsonNode highs = quoteData.path("high");
            JsonNode lows = quoteData.path("low");
            JsonNode volumes = quoteData.path("volume");

            if (highs.isArray() && !highs.isEmpty()) {
                int last = highs.size() - 1;
                if (!highs.get(last).isNull())
                    dto.setDayHigh(BigDecimal.valueOf(highs.get(last).asDouble()).setScale(4, RoundingMode.HALF_UP));
                if (!lows.get(last).isNull())
                    dto.setDayLow(BigDecimal.valueOf(lows.get(last).asDouble()).setScale(4, RoundingMode.HALF_UP));
                if (!volumes.get(last).isNull())
                    dto.setVolume(volumes.get(last).asLong());
            }

            dto.setTimestamp(System.currentTimeMillis());
            return dto;

        } catch (Exception e) {
            log.error("Failed to parse chart response for {}: {}", ticker, e.getMessage());
            return null;
        }
    }
}
