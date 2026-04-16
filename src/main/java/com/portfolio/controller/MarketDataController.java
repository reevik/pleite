package com.portfolio.controller;

import com.portfolio.dto.AssetProfileDto;
import com.portfolio.dto.EtfHoldingsDto;
import com.portfolio.dto.MarketQuoteDto;
import com.portfolio.service.MarketDataService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/market")
public class MarketDataController {

    private final MarketDataService marketDataService;

    public MarketDataController(MarketDataService marketDataService) {
        this.marketDataService = marketDataService;
    }

    @GetMapping("/quote/{ticker}")
    public ResponseEntity<MarketQuoteDto> getQuote(@PathVariable String ticker) {
        MarketQuoteDto quote = marketDataService.getQuote(ticker);
        if (quote == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(quote);
    }

    @GetMapping("/quotes")
    public Map<String, MarketQuoteDto> getQuotes(@RequestParam List<String> tickers) {
        return marketDataService.getQuotes(tickers);
    }

    @GetMapping("/search")
    public List<Map<String, String>> searchTickers(@RequestParam String q) {
        return marketDataService.searchTickers(q);
    }

    @GetMapping("/fundamentals/{ticker}")
    public ResponseEntity<java.util.Map<String, Object>> getFundamentals(@PathVariable String ticker) {
        var data = marketDataService.getFundamentals(ticker);
        if (data == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(data);
    }

    @GetMapping("/chart/{ticker}")
    public ResponseEntity<java.util.Map<String, Object>> getChart(
            @PathVariable String ticker,
            @RequestParam(defaultValue = "1d") String range,
            @RequestParam(defaultValue = "5m") String interval) {
        var data = marketDataService.getChartData(ticker, range, interval);
        if (data == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(data);
    }

    @GetMapping("/profile/{ticker}")
    public ResponseEntity<AssetProfileDto> getProfile(@PathVariable String ticker) {
        AssetProfileDto profile = marketDataService.getAssetProfile(ticker);
        if (profile == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(profile);
    }

    @GetMapping("/holdings/{ticker}")
    public ResponseEntity<EtfHoldingsDto> getHoldings(@PathVariable String ticker) {
        EtfHoldingsDto holdings = marketDataService.getEtfHoldings(ticker);
        if (holdings == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(holdings);
    }
}
