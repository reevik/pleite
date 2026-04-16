package com.portfolio.controller;

import com.portfolio.dto.MarketQuoteDto;
import com.portfolio.model.User;
import com.portfolio.model.WatchlistItem;
import com.portfolio.repository.UserRepository;
import com.portfolio.repository.WatchlistRepository;
import com.portfolio.service.AuthHelper;
import com.portfolio.service.MarketDataService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/watchlist")
public class WatchlistController {

    private final WatchlistRepository watchlistRepository;
    private final UserRepository userRepository;
    private final AuthHelper authHelper;
    private final MarketDataService marketDataService;

    public WatchlistController(WatchlistRepository watchlistRepository,
                               UserRepository userRepository,
                               AuthHelper authHelper,
                               MarketDataService marketDataService) {
        this.watchlistRepository = watchlistRepository;
        this.userRepository = userRepository;
        this.authHelper = authHelper;
        this.marketDataService = marketDataService;
    }

    @GetMapping
    public List<Map<String, Object>> getAll() {
        Long userId = authHelper.getCurrentUserId();
        List<WatchlistItem> items = watchlistRepository.findByUserIdOrderByAddedAtDesc(userId);
        if (items.isEmpty()) return Collections.emptyList();

        List<String> tickers = items.stream().map(WatchlistItem::getTicker).toList();
        Map<String, MarketQuoteDto> quotes = marketDataService.getQuotes(tickers);

        List<Map<String, Object>> result = new ArrayList<>();
        for (WatchlistItem item : items) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id", item.getId());
            entry.put("ticker", item.getTicker());
            entry.put("name", item.getName());
            entry.put("assetType", item.getAssetType());
            entry.put("exchange", item.getExchange());
            entry.put("addedAt", item.getAddedAt());

            MarketQuoteDto quote = quotes.get(item.getTicker().toUpperCase());
            if (quote != null) {
                entry.put("price", quote.getPrice());
                entry.put("dayChange", quote.getDayChange());
                entry.put("dayChangePercent", quote.getDayChangePercent());
                entry.put("previousClose", quote.getPreviousClose());
                entry.put("currency", quote.getCurrency());
            }
            result.add(entry);
        }
        return result;
    }

    @PostMapping
    public ResponseEntity<?> add(@RequestBody WatchlistItem item) {
        if (item.getTicker() == null || item.getTicker().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ticker is required"));
        }

        Long userId = authHelper.getCurrentUserId();
        if (watchlistRepository.existsByTickerIgnoreCaseAndUserId(item.getTicker().trim(), userId)) {
            return ResponseEntity.ok(Map.of("message", "Already in watchlist"));
        }

        User user = userRepository.getReferenceById(userId);
        item.setUser(user);
        WatchlistItem saved = watchlistRepository.save(item);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remove(@PathVariable Long id) {
        Long userId = authHelper.getCurrentUserId();
        WatchlistItem item = watchlistRepository.findByIdAndUserId(id, userId).orElse(null);
        if (item == null) return ResponseEntity.notFound().build();
        watchlistRepository.delete(item);
        return ResponseEntity.noContent().build();
    }
}
