package com.portfolio.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * ETF breakdown data from Yahoo Finance topHoldings module.
 * Contains sector weightings and top holdings with their geographic profiles.
 */
public class EtfHoldingsDto {

    private String ticker;

    /** Sector name -> weight (0.0 to 1.0), e.g. "Technology" -> 0.3356 */
    private Map<String, BigDecimal> sectorWeightings;

    /** Top holdings with their weight and resolved country/region */
    private List<Holding> holdings;

    /** Sum of all holding weights (typically 0.3 – 0.5 for top 10) */
    private BigDecimal holdingsCoverage;

    public static class Holding {
        private String symbol;
        private String name;
        private BigDecimal weight;   // 0.0 to 1.0
        private String country;
        private String region;

        public Holding() {}

        public Holding(String symbol, String name, BigDecimal weight, String country, String region) {
            this.symbol = symbol;
            this.name = name;
            this.weight = weight;
            this.country = country;
            this.region = region;
        }

        public String getSymbol() { return symbol; }
        public void setSymbol(String symbol) { this.symbol = symbol; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public BigDecimal getWeight() { return weight; }
        public void setWeight(BigDecimal weight) { this.weight = weight; }
        public String getCountry() { return country; }
        public void setCountry(String country) { this.country = country; }
        public String getRegion() { return region; }
        public void setRegion(String region) { this.region = region; }
    }

    // Yahoo uses snake_case keys for sectors; map them to display names
    private static final Map<String, String> SECTOR_KEY_MAP = Map.ofEntries(
            Map.entry("technology", "Technology"),
            Map.entry("financial_services", "Financial Services"),
            Map.entry("healthcare", "Healthcare"),
            Map.entry("energy", "Energy"),
            Map.entry("consumer_cyclical", "Consumer Cyclical"),
            Map.entry("consumer_defensive", "Consumer Defensive"),
            Map.entry("industrials", "Industrials"),
            Map.entry("basic_materials", "Basic Materials"),
            Map.entry("realestate", "Real Estate"),
            Map.entry("real_estate", "Real Estate"),
            Map.entry("utilities", "Utilities"),
            Map.entry("communication_services", "Communication Services")
    );

    public static String normalizeSectorKey(String yahooKey) {
        return SECTOR_KEY_MAP.getOrDefault(yahooKey, capitalize(yahooKey));
    }

    private static String capitalize(String s) {
        if (s == null || s.isBlank()) return s;
        return s.substring(0, 1).toUpperCase() + s.substring(1).replace('_', ' ');
    }

    // Getters and Setters
    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }

    public Map<String, BigDecimal> getSectorWeightings() { return sectorWeightings; }
    public void setSectorWeightings(Map<String, BigDecimal> sectorWeightings) { this.sectorWeightings = sectorWeightings; }

    public List<Holding> getHoldings() { return holdings; }
    public void setHoldings(List<Holding> holdings) { this.holdings = holdings; }

    public BigDecimal getHoldingsCoverage() { return holdingsCoverage; }
    public void setHoldingsCoverage(BigDecimal holdingsCoverage) { this.holdingsCoverage = holdingsCoverage; }
}
