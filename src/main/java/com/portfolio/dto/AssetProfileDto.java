package com.portfolio.dto;

import java.util.HashMap;
import java.util.Map;

public class AssetProfileDto {

    private String ticker;
    private String country;
    private String region;
    private String sector;
    private String industry;

    private static final Map<String, String> COUNTRY_TO_REGION = Map.ofEntries(
            Map.entry("United States", "North America"),
            Map.entry("Canada", "North America"),
            Map.entry("Mexico", "North America"),
            Map.entry("United Kingdom", "Europe"),
            Map.entry("Germany", "Europe"),
            Map.entry("France", "Europe"),
            Map.entry("Switzerland", "Europe"),
            Map.entry("Netherlands", "Europe"),
            Map.entry("Sweden", "Europe"),
            Map.entry("Denmark", "Europe"),
            Map.entry("Norway", "Europe"),
            Map.entry("Finland", "Europe"),
            Map.entry("Italy", "Europe"),
            Map.entry("Spain", "Europe"),
            Map.entry("Belgium", "Europe"),
            Map.entry("Ireland", "Europe"),
            Map.entry("Austria", "Europe"),
            Map.entry("Luxembourg", "Europe"),
            Map.entry("Portugal", "Europe"),
            Map.entry("Greece", "Europe"),
            Map.entry("Poland", "Europe"),
            Map.entry("Czech Republic", "Europe"),
            Map.entry("Japan", "Asia Pacific"),
            Map.entry("China", "Asia Pacific"),
            Map.entry("Hong Kong", "Asia Pacific"),
            Map.entry("South Korea", "Asia Pacific"),
            Map.entry("Taiwan", "Asia Pacific"),
            Map.entry("Australia", "Asia Pacific"),
            Map.entry("New Zealand", "Asia Pacific"),
            Map.entry("Singapore", "Asia Pacific"),
            Map.entry("India", "Asia Pacific"),
            Map.entry("Indonesia", "Asia Pacific"),
            Map.entry("Thailand", "Asia Pacific"),
            Map.entry("Malaysia", "Asia Pacific"),
            Map.entry("Philippines", "Asia Pacific"),
            Map.entry("Vietnam", "Asia Pacific"),
            Map.entry("Israel", "Middle East"),
            Map.entry("Saudi Arabia", "Middle East"),
            Map.entry("United Arab Emirates", "Middle East"),
            Map.entry("Turkey", "Middle East"),
            Map.entry("South Africa", "Africa"),
            Map.entry("Nigeria", "Africa"),
            Map.entry("Egypt", "Africa"),
            Map.entry("Brazil", "Latin America"),
            Map.entry("Argentina", "Latin America"),
            Map.entry("Chile", "Latin America"),
            Map.entry("Colombia", "Latin America"),
            Map.entry("Peru", "Latin America"),
            Map.entry("Russia", "Europe")
    );

    public static String regionForCountry(String country) {
        if (country == null || country.isBlank()) return null;
        return COUNTRY_TO_REGION.getOrDefault(country, "Other");
    }

    /**
     * Maps stock exchange names (as returned by Yahoo Finance chart API meta.exchangeName) to country.
     * Yahoo returns both short codes and full names depending on the exchange, so we map both forms.
     * Used as fallback when the assetProfile endpoint is unavailable.
     */
    private static final Map<String, String> EXCHANGE_TO_COUNTRY = new HashMap<>();
    static {
        // US exchanges — Yahoo returns "NasdaqGS", "NasdaqGM", "NasdaqCM", "NYSE", "NYSEArca", etc.
        for (String e : new String[]{
                "NMS", "NGM", "NCM", "NYQ", "NYSE", "NASDAQ", "Nasdaq",
                "NasdaqGS", "NasdaqGM", "NasdaqCM", "NYSEArca", "NYSE Arca",
                "NYSEAMERICAN", "NYSE American", "AMEX", "BTS", "BATS",
                "CboeBZX", "Cboe BZX", "PCX", "OTC", "OTC Markets", "PNK",
                "CCC", "CCY"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "United States");
        }
        // Germany — Yahoo returns "XETRA", "Frankfurt", "Xetra", "GER"
        for (String e : new String[]{
                "GER", "XETRA", "Xetra", "FRA", "Frankfurt", "XETR",
                "Berlin", "Stuttgart", "Munich", "Hamburg", "Dusseldorf",
                "Düsseldorf", "Hannover", "F", "DE"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Germany");
        }
        // UK — Yahoo returns "LSE", "London", "IOB"
        for (String e : new String[]{
                "LSE", "LON", "London", "IOB", "London Stock Exchange"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "United Kingdom");
        }
        // France — Yahoo returns "Paris", "ENX"
        for (String e : new String[]{
                "PAR", "Paris", "ENX", "Euronext", "Euronext Paris"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "France");
        }
        // Netherlands — Yahoo returns "Amsterdam"
        for (String e : new String[]{"AMS", "Amsterdam", "Euronext Amsterdam"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Netherlands");
        }
        // Belgium
        for (String e : new String[]{"BRU", "Brussels", "Euronext Brussels"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Belgium");
        }
        // Portugal
        for (String e : new String[]{"LIS", "Lisbon", "Euronext Lisbon"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Portugal");
        }
        // Switzerland — Yahoo returns "Swiss", "EBS", "Swiss Exchange"
        for (String e : new String[]{
                "EBS", "SWX", "VTX", "Swiss", "Swiss Exchange", "SIX"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Switzerland");
        }
        // Italy — Yahoo returns "Milan", "BIT"
        for (String e : new String[]{"MIL", "Milan", "BIT", "Borsa Italiana"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Italy");
        }
        // Spain — Yahoo returns "Madrid", "MCE", "BME"
        for (String e : new String[]{"MCE", "BME", "Madrid", "Bolsa de Madrid"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Spain");
        }
        // Sweden — Yahoo returns "Stockholm", "STO"
        for (String e : new String[]{"STO", "Stockholm", "OMX Stockholm"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Sweden");
        }
        // Denmark — Yahoo returns "Copenhagen", "CPH"
        for (String e : new String[]{"CPH", "Copenhagen"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Denmark");
        }
        // Norway — Yahoo returns "Oslo", "OSL"
        for (String e : new String[]{"OSL", "Oslo", "OL"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Norway");
        }
        // Finland — Yahoo returns "Helsinki", "HEL"
        for (String e : new String[]{"HEL", "Helsinki"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Finland");
        }
        // Austria
        for (String e : new String[]{"VIE", "Vienna", "Wien"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Austria");
        }
        // Ireland
        for (String e : new String[]{"ISE", "Dublin", "Irish"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Ireland");
        }
        // Canada — Yahoo returns "Toronto", "TOR", "TSX"
        for (String e : new String[]{
                "TOR", "TSX", "Toronto", "VAN", "CNQ", "NEO"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Canada");
        }
        // Japan — Yahoo returns "Tokyo", "JPX", "Osaka"
        for (String e : new String[]{"JPX", "TYO", "TSE", "Tokyo", "Osaka"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Japan");
        }
        // Hong Kong — Yahoo returns "HKSE", "Hong Kong"
        for (String e : new String[]{"HKG", "HKSE", "Hong Kong"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Hong Kong");
        }
        // Australia — Yahoo returns "ASX", "Sydney"
        for (String e : new String[]{"ASX", "AX", "Sydney", "Australian"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Australia");
        }
        // New Zealand
        for (String e : new String[]{"NZE", "NZ", "New Zealand"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "New Zealand");
        }
        // South Korea — Yahoo returns "KOSPI", "KOSDAQ", "KSC"
        for (String e : new String[]{"KSC", "KOE", "KOSPI", "KOSDAQ", "Korea"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "South Korea");
        }
        // Taiwan — Yahoo returns "Taiwan", "TSEC", "TAI"
        for (String e : new String[]{"TAI", "TWO", "Taiwan", "TSEC"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Taiwan");
        }
        // India — Yahoo returns "NSI", "BSE", "NSE India"
        for (String e : new String[]{"NSI", "BOM", "BSE", "NSE India", "Bombay"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "India");
        }
        // Singapore — Yahoo returns "Singapore", "SES", "SGX"
        for (String e : new String[]{"SES", "SGX", "Singapore"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Singapore");
        }
        // China — Yahoo returns "Shanghai", "Shenzhen"
        for (String e : new String[]{"SHH", "SHZ", "Shanghai", "Shenzhen"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "China");
        }
        // Brazil — Yahoo returns "Sao Paulo", "SAO"
        for (String e : new String[]{"SAO", "BVMF", "Sao Paulo", "São Paulo"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Brazil");
        }
        // Israel
        for (String e : new String[]{"TLV", "Tel Aviv"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Israel");
        }
        // Mexico
        for (String e : new String[]{"MEX", "Mexico"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Mexico");
        }
        // South Africa
        for (String e : new String[]{"JNB", "JSE", "Johannesburg"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "South Africa");
        }
        // Turkey
        for (String e : new String[]{"IST", "Istanbul", "BIST"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Turkey");
        }
        // Saudi Arabia
        for (String e : new String[]{"Tadawul", "SAU", "Saudi"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Saudi Arabia");
        }
        // Poland
        for (String e : new String[]{"WSE", "Warsaw"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Poland");
        }
        // Greece
        for (String e : new String[]{"ATH", "Athens"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Greece");
        }
        // Czech Republic
        for (String e : new String[]{"PRA", "Prague"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Czech Republic");
        }
        // Russia
        for (String e : new String[]{"MCX", "Moscow"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Russia");
        }
        // Indonesia
        for (String e : new String[]{"JKT", "Jakarta"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Indonesia");
        }
        // Thailand
        for (String e : new String[]{"SET", "Bangkok"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Thailand");
        }
        // Malaysia
        for (String e : new String[]{"KLS", "Kuala Lumpur", "KLSE"}) {
            EXCHANGE_TO_COUNTRY.put(e.toLowerCase(), "Malaysia");
        }
    }

    /**
     * Infer country from exchange name. Case-insensitive lookup with substring fallback.
     * Returns null if exchange is unknown.
     */
    public static String countryForExchange(String exchange) {
        if (exchange == null || exchange.isBlank()) return null;
        // Exact case-insensitive match
        String country = EXCHANGE_TO_COUNTRY.get(exchange.toLowerCase());
        if (country != null) return country;
        // Substring match: e.g. "Euronext Amsterdam" contains "amsterdam"
        String lower = exchange.toLowerCase();
        for (Map.Entry<String, String> entry : EXCHANGE_TO_COUNTRY.entrySet()) {
            if (lower.contains(entry.getKey()) || entry.getKey().contains(lower)) {
                return entry.getValue();
            }
        }
        return null;
    }

    /**
     * Maps ISO currency codes to their primary country.
     * Used to assign region/country to CASH positions.
     */
    private static final Map<String, String> CURRENCY_TO_COUNTRY = Map.ofEntries(
            Map.entry("USD", "United States"),
            Map.entry("EUR", "Germany"),          // Eurozone — default to Germany
            Map.entry("GBP", "United Kingdom"),
            Map.entry("CHF", "Switzerland"),
            Map.entry("JPY", "Japan"),
            Map.entry("CAD", "Canada"),
            Map.entry("AUD", "Australia"),
            Map.entry("NZD", "New Zealand"),
            Map.entry("SEK", "Sweden"),
            Map.entry("NOK", "Norway"),
            Map.entry("DKK", "Denmark"),
            Map.entry("PLN", "Poland"),
            Map.entry("CZK", "Czech Republic"),
            Map.entry("HUF", "Hungary"),
            Map.entry("TRY", "Turkey"),
            Map.entry("ZAR", "South Africa"),
            Map.entry("BRL", "Brazil"),
            Map.entry("MXN", "Mexico"),
            Map.entry("CNY", "China"),
            Map.entry("HKD", "Hong Kong"),
            Map.entry("SGD", "Singapore"),
            Map.entry("KRW", "South Korea"),
            Map.entry("TWD", "Taiwan"),
            Map.entry("INR", "India"),
            Map.entry("IDR", "Indonesia"),
            Map.entry("THB", "Thailand"),
            Map.entry("MYR", "Malaysia"),
            Map.entry("PHP", "Philippines"),
            Map.entry("ILS", "Israel"),
            Map.entry("SAR", "Saudi Arabia"),
            Map.entry("AED", "United Arab Emirates"),
            Map.entry("RUB", "Russia")
    );

    /**
     * Infer country from currency code. Used for CASH positions.
     */
    public static String countryForCurrency(String currency) {
        if (currency == null || currency.isBlank()) return null;
        return CURRENCY_TO_COUNTRY.get(currency.toUpperCase().trim());
    }

    // Getters and Setters
    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }

    public String getSector() { return sector; }
    public void setSector(String sector) { this.sector = sector; }

    public String getIndustry() { return industry; }
    public void setIndustry(String industry) { this.industry = industry; }
}
