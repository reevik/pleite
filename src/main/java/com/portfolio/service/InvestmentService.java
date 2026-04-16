package com.portfolio.service;

import com.portfolio.dto.*;
import com.portfolio.model.Investment;
import com.portfolio.model.MonthlyHoldingSnapshot;
import com.portfolio.model.MonthlySnapshot;
import com.portfolio.model.Transaction;
import com.portfolio.model.User;
import com.portfolio.repository.InvestmentRepository;
import com.portfolio.repository.MonthlyHoldingSnapshotRepository;
import com.portfolio.repository.MonthlySnapshotRepository;
import com.portfolio.repository.TransactionRepository;
import com.portfolio.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class InvestmentService {

    private static final Logger log = LoggerFactory.getLogger(InvestmentService.class);

    private final InvestmentRepository repository;
    private final TransactionRepository transactionRepository;
    private final MonthlySnapshotRepository snapshotRepository;
    private final MonthlyHoldingSnapshotRepository holdingSnapshotRepository;
    private final UserRepository userRepository;
    private final AuthHelper authHelper;
    private final MarketDataService marketDataService;

    public InvestmentService(InvestmentRepository repository,
                             TransactionRepository transactionRepository,
                             MonthlySnapshotRepository snapshotRepository,
                             MonthlyHoldingSnapshotRepository holdingSnapshotRepository,
                             UserRepository userRepository,
                             AuthHelper authHelper,
                             MarketDataService marketDataService) {
        this.repository = repository;
        this.transactionRepository = transactionRepository;
        this.snapshotRepository = snapshotRepository;
        this.holdingSnapshotRepository = holdingSnapshotRepository;
        this.userRepository = userRepository;
        this.authHelper = authHelper;
        this.marketDataService = marketDataService;
    }

    private User currentUser() {
        return userRepository.findById(authHelper.getCurrentUserId())
                .orElseThrow(() -> new IllegalStateException("User not found"));
    }

    @Transactional
    public Investment create(Investment investment) {
        investment.setUser(currentUser());
        enrichWithProfile(investment);
        return repository.save(investment);
    }

    @Transactional
    public List<Investment> createAll(List<Investment> investments) {
        User user = currentUser();
        investments.forEach(inv -> { inv.setUser(user); enrichWithProfile(inv); });
        return repository.saveAll(investments);
    }

    private void enrichWithProfile(Investment inv) {
        if (inv.getTicker() == null) return;
        if (inv.getAssetType() == Investment.AssetType.CASH) return; // no profile for cash
        boolean needsRegion = inv.getRegion() == null || inv.getRegion().isBlank();
        boolean needsCountry = inv.getCountry() == null || inv.getCountry().isBlank();
        boolean needsSector = inv.getSector() == null || inv.getSector().isBlank();

        if (!needsRegion && !needsCountry && !needsSector) return;

        try {
            AssetProfileDto profile = marketDataService.getAssetProfile(inv.getTicker());
            if (profile == null) return;
            if (needsCountry && profile.getCountry() != null) inv.setCountry(profile.getCountry());
            if (needsRegion && profile.getRegion() != null) inv.setRegion(profile.getRegion());
            if (needsSector && profile.getSector() != null) inv.setSector(profile.getSector());
        } catch (Exception e) {
            log.warn("Could not enrich profile for {}: {}", inv.getTicker(), e.getMessage());
        }
    }

    @Transactional
    public Investment update(Long id, Investment updated) {
        Long userId = authHelper.getCurrentUserId();
        Investment existing = repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException("Investment not found: " + id));

        existing.setTicker(updated.getTicker());
        existing.setName(updated.getName());
        existing.setQuantity(updated.getQuantity());
        existing.setPurchasePrice(updated.getPurchasePrice());
        existing.setPurchaseDate(updated.getPurchaseDate());
        existing.setAssetType(updated.getAssetType());
        existing.setCurrency(updated.getCurrency());
        existing.setNotes(updated.getNotes());
        existing.setExchange(updated.getExchange());
        existing.setRegion(updated.getRegion());
        existing.setCountry(updated.getCountry());
        existing.setSector(updated.getSector());

        return repository.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        Long userId = authHelper.getCurrentUserId();
        Investment inv = repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException("Investment not found: " + id));
        repository.delete(inv);
    }

    @Transactional(readOnly = true)
    public Optional<Investment> findById(Long id) {
        return repository.findByIdAndUserId(id, authHelper.getCurrentUserId());
    }

    @Transactional(readOnly = true)
    public List<Investment> findAll() {
        return repository.findByUserIdOrderByPurchaseDateDesc(authHelper.getCurrentUserId());
    }

    // ---- Buy / Sell ----

    /**
     * Buy more of an existing holding.
     * Updates avg cost basis using weighted average: newAvg = (oldQty*oldAvg + buyQty*buyPrice) / newQty.
     * If a cash account is selected, the total cost (qty*price + fees) is debited from it.
     */
    @Transactional
    public TransactionDto buyMore(Long investmentId, TradeRequestDto req) {
        Long userId = authHelper.getCurrentUserId();
        Investment inv = repository.findByIdAndUserId(investmentId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Investment not found: " + investmentId));

        BigDecimal oldQty = inv.getQuantity();
        BigDecimal oldAvg = inv.getPurchasePrice();
        BigDecimal buyQty = req.getQuantity();
        BigDecimal buyPrice = req.getPrice();
        BigDecimal fees = req.getFees() != null ? req.getFees() : BigDecimal.ZERO;

        // Debit cash account if selected
        BigDecimal totalDebit = buyQty.multiply(buyPrice).add(fees).setScale(4, RoundingMode.HALF_UP);
        adjustCash(req.getCashInvestmentId(), totalDebit.negate());

        BigDecimal newQty = oldQty.add(buyQty);
        // Weighted average cost
        BigDecimal newAvg = oldQty.multiply(oldAvg)
                .add(buyQty.multiply(buyPrice))
                .divide(newQty, 4, RoundingMode.HALF_UP);

        inv.setQuantity(newQty);
        inv.setPurchasePrice(newAvg);
        repository.save(inv);

        // Record the transaction
        Transaction tx = new Transaction();
        tx.setInvestment(inv);
        tx.setType(Transaction.Type.BUY);
        tx.setQuantity(buyQty);
        tx.setPrice(buyPrice);
        tx.setTransactionDate(req.getDate());
        tx.setFees(fees);
        tx.setCostBasis(newAvg);
        tx.setNotes(req.getNotes());
        transactionRepository.save(tx);

        return TransactionDto.from(tx);
    }

    /**
     * Sell part or all of a holding.
     * Realized G/L = (sellPrice - avgCost) * sellQty - fees.
     * If a cash account is selected, the proceeds (qty*price - fees) are credited to it.
     * If fully sold, the investment is deleted.
     */
    @Transactional
    public TransactionDto sell(Long investmentId, TradeRequestDto req) {
        Long userId = authHelper.getCurrentUserId();
        Investment inv = repository.findByIdAndUserId(investmentId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Investment not found: " + investmentId));

        BigDecimal sellQty = req.getQuantity();
        if (sellQty.compareTo(inv.getQuantity()) > 0) {
            throw new IllegalArgumentException(
                    "Cannot sell " + sellQty.stripTrailingZeros().toPlainString()
                    + " — only " + inv.getQuantity().stripTrailingZeros().toPlainString() + " held");
        }

        BigDecimal avgCost = inv.getPurchasePrice();
        BigDecimal sellPrice = req.getPrice();
        BigDecimal fees = req.getFees() != null ? req.getFees() : BigDecimal.ZERO;

        BigDecimal realizedGL = sellPrice.subtract(avgCost)
                .multiply(sellQty)
                .setScale(4, RoundingMode.HALF_UP)
                .subtract(fees);

        // Credit cash account if selected
        BigDecimal proceeds = sellQty.multiply(sellPrice).subtract(fees).setScale(4, RoundingMode.HALF_UP);
        adjustCash(req.getCashInvestmentId(), proceeds);

        // Record the transaction (before potentially deleting the investment)
        Transaction tx = new Transaction();
        tx.setInvestment(inv);
        tx.setType(Transaction.Type.SELL);
        tx.setQuantity(sellQty);
        tx.setPrice(sellPrice);
        tx.setTransactionDate(req.getDate());
        tx.setFees(fees);
        tx.setRealizedGainLoss(realizedGL);
        tx.setCostBasis(avgCost);
        tx.setNotes(req.getNotes());
        transactionRepository.save(tx);

        BigDecimal remaining = inv.getQuantity().subtract(sellQty);
        inv.setQuantity(remaining.max(BigDecimal.ZERO));
        // avgCost stays unchanged — preserved for undo and realized G/L history
        repository.save(inv);

        return TransactionDto.from(tx);
    }

    /**
     * Adjust a cash position's quantity by the given delta.
     * Positive delta = credit (sell proceeds), negative delta = debit (purchase cost).
     * Validates sufficient funds for debits.
     */
    private void adjustCash(Long cashInvestmentId, BigDecimal delta) {
        if (cashInvestmentId == null) return;

        Long userId = authHelper.getCurrentUserId();
        Investment cash = repository.findByIdAndUserId(cashInvestmentId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Cash account not found: " + cashInvestmentId));

        if (cash.getAssetType() != Investment.AssetType.CASH) {
            throw new IllegalArgumentException("Selected account is not a cash position");
        }

        BigDecimal newBalance = cash.getQuantity().add(delta);
        if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException(
                    "Insufficient funds in \"" + cash.getName() + "\": need "
                    + delta.negate().setScale(2, RoundingMode.HALF_UP).toPlainString()
                    + " but only " + cash.getQuantity().setScale(2, RoundingMode.HALF_UP).toPlainString()
                    + " available");
        }

        cash.setQuantity(newBalance);
        repository.save(cash);
    }

    /**
     * Undo a transaction and all subsequent transactions for the same investment.
     *
     * Recalculates the investment's quantity and average cost basis from scratch:
     * 1. Reverse ALL transactions to discover the investment's original (pre-trade) state.
     * 2. Replay only the transactions that predate the undone one.
     * 3. Delete the target transaction and every later one.
     */
    @Transactional
    public UndoResultDto undoTransaction(Long transactionId) {
        Long userId = authHelper.getCurrentUserId();

        Transaction target = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found"));

        Investment inv = target.getInvestment();
        if (!inv.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Transaction not found");
        }

        // All transactions for this investment in creation order
        List<Transaction> allTxs = transactionRepository.findByInvestmentIdOrderByIdAsc(inv.getId());

        // Find the target's index
        int targetIdx = -1;
        for (int i = 0; i < allTxs.size(); i++) {
            if (allTxs.get(i).getId().equals(transactionId)) {
                targetIdx = i;
                break;
            }
        }
        if (targetIdx < 0) throw new IllegalArgumentException("Transaction not found");

        List<Transaction> keep   = allTxs.subList(0, targetIdx);
        List<Transaction> remove = new ArrayList<>(allTxs.subList(targetIdx, allTxs.size()));

        // --- Step 1: reverse ALL transactions to find the original investment state ---
        BigDecimal qty = inv.getQuantity();
        BigDecimal avg = inv.getPurchasePrice();

        for (int i = allTxs.size() - 1; i >= 0; i--) {
            Transaction tx = allTxs.get(i);
            if (tx.getType() == Transaction.Type.BUY) {
                BigDecimal prevQty = qty.subtract(tx.getQuantity());
                if (prevQty.compareTo(BigDecimal.ZERO) > 0) {
                    avg = qty.multiply(avg)
                            .subtract(tx.getQuantity().multiply(tx.getPrice()))
                            .divide(prevQty, 4, RoundingMode.HALF_UP);
                }
                qty = prevQty;
            } else { // SELL
                qty = qty.add(tx.getQuantity());
                // avg unchanged by sells
            }
        }

        // qty / avg now represent the investment's state before any transactions
        BigDecimal initialQty = qty;
        BigDecimal initialAvg = avg;

        // --- Step 2: replay only the kept transactions ---
        qty = initialQty;
        avg = initialAvg;

        for (Transaction tx : keep) {
            if (tx.getType() == Transaction.Type.BUY) {
                BigDecimal newQty = qty.add(tx.getQuantity());
                avg = qty.multiply(avg)
                        .add(tx.getQuantity().multiply(tx.getPrice()))
                        .divide(newQty, 4, RoundingMode.HALF_UP);
                qty = newQty;
            } else { // SELL
                qty = qty.subtract(tx.getQuantity());
            }
        }

        // --- Step 3: update the investment ---
        inv.setQuantity(qty.max(BigDecimal.ZERO));
        inv.setPurchasePrice(avg);
        repository.save(inv);

        // --- Step 4: build the response BEFORE deleting ---
        List<TransactionDto> undoneDtos = remove.stream()
                .map(TransactionDto::from)
                .toList();

        // --- Step 5: delete undone transactions ---
        transactionRepository.deleteAll(remove);

        log.info("Undid {} transaction(s) for {} (id={}). Restored qty={}, avg={}",
                remove.size(), inv.getTicker(), inv.getId(), qty, avg);

        return new UndoResultDto(remove.size(), undoneDtos);
    }

    /** Get transaction history for a specific investment. */
    @Transactional(readOnly = true)
    public List<TransactionDto> getTransactions(Long investmentId) {
        return transactionRepository.findByInvestmentIdOrderByTransactionDateDesc(investmentId)
                .stream()
                .map(TransactionDto::from)
                .toList();
    }

    /** Get all transactions across all investments for the current user. */
    @Transactional(readOnly = true)
    public List<TransactionDto> getAllTransactions() {
        return transactionRepository.findAllByUserId(authHelper.getCurrentUserId()).stream()
                .map(TransactionDto::from)
                .toList();
    }

    /**
     * Build portfolio summary with live market data.
     */
    public PortfolioSummaryDto getPortfolioSummary() {
        Long userId = authHelper.getCurrentUserId();
        List<Investment> investments = repository.findByUserId(userId);

        // Backfill any investments missing profile data (skip CASH)
        boolean dirty = false;
        for (Investment inv : investments) {
            if (inv.getAssetType() == Investment.AssetType.CASH) continue;
            boolean missing = (inv.getRegion() == null || inv.getRegion().isBlank())
                    || (inv.getCountry() == null || inv.getCountry().isBlank())
                    || (inv.getSector() == null || inv.getSector().isBlank());
            if (missing) {
                enrichWithProfile(inv);
                dirty = true;
            }
        }
        if (dirty) {
            repository.saveAll(investments);
        }

        // Only fetch quotes for non-CASH tickers
        List<String> tickers = investments.stream()
                .filter(inv -> inv.getAssetType() != Investment.AssetType.CASH)
                .map(Investment::getTicker)
                .distinct()
                .toList();

        // Fetch live quotes for all tickers
        Map<String, MarketQuoteDto> quotes = tickers.isEmpty()
                ? Collections.emptyMap()
                : marketDataService.getQuotes(tickers);

        // Fallback enrichment: use exchange name from quote data to infer country/region
        boolean dirtyFromExchange = false;
        for (Investment inv : investments) {
            boolean needsCountry = inv.getCountry() == null || inv.getCountry().isBlank();
            boolean needsRegion = inv.getRegion() == null || inv.getRegion().isBlank();
            if (!needsCountry && !needsRegion) continue;

            // Skip CASH — geographic allocation only covers Stocks and ETFs
            if (inv.getAssetType() == Investment.AssetType.CASH) continue;

            MarketQuoteDto quote = quotes.get(inv.getTicker().toUpperCase());
            if (quote == null || quote.getExchange() == null) continue;

            String country = AssetProfileDto.countryForExchange(quote.getExchange());
            if (country != null) {
                String region = AssetProfileDto.regionForCountry(country);
                if (needsCountry) inv.setCountry(country);
                if (needsRegion) inv.setRegion(region);
                dirtyFromExchange = true;
                // Also persist to stock_profiles DB cache
                marketDataService.saveExchangeProfile(
                        inv.getTicker(), country, region, quote.getExchange());
                log.info("Enriched {} from exchange '{}' → {} / {}",
                        inv.getTicker(), quote.getExchange(), country, inv.getRegion());
            } else {
                log.warn("Unknown exchange '{}' for ticker {} — cannot infer country/region",
                        quote.getExchange(), inv.getTicker());
            }
        }
        if (dirtyFromExchange) {
            repository.saveAll(investments);
        }

        // Log positions still missing region for diagnostics
        investments.stream()
                .filter(inv -> inv.getRegion() == null || inv.getRegion().isBlank())
                .forEach(inv -> log.warn("STILL UNASSIGNED: {} ({}) type={} currency={} country={}",
                        inv.getTicker(), inv.getName(), inv.getAssetType(),
                        inv.getCurrency(), inv.getCountry()));

        // Build position DTOs (with per-position realized G/L)
        List<PortfolioPositionDto> positions = investments.stream()
                .map(inv -> {
                    MarketQuoteDto quote = quotes.get(inv.getTicker().toUpperCase());
                    BigDecimal currentPrice = quote != null ? quote.getPrice() : null;
                    BigDecimal dayChange = quote != null ? quote.getDayChange() : null;
                    BigDecimal dayChangePct = quote != null ? quote.getDayChangePercent() : null;
                    BigDecimal realizedGL = transactionRepository.sumRealizedGainLossByInvestmentId(inv.getId());
                    return PortfolioPositionDto.from(inv, currentPrice, dayChange, dayChangePct, realizedGL);
                })
                .collect(Collectors.toList());

        // Aggregate totals
        BigDecimal totalValue = positions.stream()
                .map(PortfolioPositionDto::getCurrentValue)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCost = positions.stream()
                .map(PortfolioPositionDto::getTotalCost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalGainLoss = totalValue.subtract(totalCost);

        BigDecimal totalGainLossPercent = BigDecimal.ZERO;
        if (totalCost.compareTo(BigDecimal.ZERO) > 0) {
            totalGainLossPercent = totalGainLoss
                    .divide(totalCost, 6, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
        }

        // Day change aggregate
        BigDecimal dayChange = positions.stream()
                .filter(p -> p.getDayChange() != null && p.getQuantity() != null)
                .map(p -> p.getDayChange().multiply(p.getQuantity()))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        // Allocation by asset type
        Map<String, BigDecimal> allocationByType = new LinkedHashMap<>();
        if (totalValue.compareTo(BigDecimal.ZERO) > 0) {
            positions.stream()
                    .collect(Collectors.groupingBy(PortfolioPositionDto::getAssetType))
                    .forEach((type, posns) -> {
                        BigDecimal typeValue = posns.stream()
                                .map(PortfolioPositionDto::getCurrentValue)
                                .filter(Objects::nonNull)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                        BigDecimal pct = typeValue.divide(totalValue, 4, RoundingMode.HALF_UP)
                                .multiply(BigDecimal.valueOf(100))
                                .setScale(1, RoundingMode.HALF_UP);
                        allocationByType.put(type, pct);
                    });
        }

        // Total realized gains/losses (from all sells for this user)
        BigDecimal totalRealizedGL = transactionRepository.sumAllRealizedGainLossByUserId(userId);

        PortfolioSummaryDto summary = new PortfolioSummaryDto();
        summary.setTotalValue(totalValue.setScale(2, RoundingMode.HALF_UP));
        summary.setTotalCost(totalCost.setScale(2, RoundingMode.HALF_UP));
        summary.setTotalGainLoss(totalGainLoss.setScale(2, RoundingMode.HALF_UP));
        summary.setTotalGainLossPercent(totalGainLossPercent);
        summary.setTotalRealizedGainLoss(totalRealizedGL.setScale(2, RoundingMode.HALF_UP));
        summary.setDayChange(dayChange);
        summary.setPositionCount(positions.size());
        summary.setPositions(positions);
        summary.setAllocationByType(allocationByType);

        // Fetch ETF holdings for all ETF/FUND positions (for decomposition)
        Map<String, EtfHoldingsDto> etfHoldingsMap = new HashMap<>();
        for (PortfolioPositionDto p : positions) {
            String type = p.getAssetType();
            if ("ETF".equals(type) || "FUND".equals(type)) {
                try {
                    EtfHoldingsDto etfData = marketDataService.getEtfHoldings(p.getTicker());
                    if (etfData != null) {
                        etfHoldingsMap.put(p.getTicker().toUpperCase(), etfData);
                    }
                } catch (Exception e) {
                    log.debug("Could not fetch ETF holdings for {}: {}", p.getTicker(), e.getMessage());
                }
            }
        }

        // Compute allocations with ETF decomposition
        summary.setAllocationBySector(computeSectorAllocation(positions, totalValue, etfHoldingsMap));
        summary.setAllocationByRegion(computeGeographicAllocation(positions, totalValue, etfHoldingsMap, "region"));
        summary.setAllocationByCountry(computeGeographicAllocation(positions, totalValue, etfHoldingsMap, "country"));

        // Upsert monthly snapshot for return tracking (with per-holding breakdown)
        saveMonthlySnapshot(totalValue, totalCost, positions);

        return summary;
    }

    /** Save or update the portfolio value snapshot (aggregate + per-holding) for the current month. */
    private void saveMonthlySnapshot(BigDecimal totalValue, BigDecimal totalCost,
                                      List<PortfolioPositionDto> positions) {
        try {
            Long userId = authHelper.getCurrentUserId();
            User user = userRepository.getReferenceById(userId);
            java.time.LocalDate now = java.time.LocalDate.now();
            int year = now.getYear();
            int month = now.getMonthValue();

            MonthlySnapshot snap = snapshotRepository.findByYearAndMonthAndUserId(year, month, userId)
                    .orElse(new MonthlySnapshot(year, month, totalValue, totalCost));
            snap.setUser(user);
            snap.setTotalValue(totalValue.setScale(2, RoundingMode.HALF_UP));
            snap.setTotalCost(totalCost.setScale(2, RoundingMode.HALF_UP));
            snapshotRepository.save(snap);

            // Save per-holding breakdown: delete old, insert fresh
            holdingSnapshotRepository.deleteBySnapshotId(snap.getId());
            holdingSnapshotRepository.flush();
            List<MonthlyHoldingSnapshot> holdingSnaps = positions.stream()
                    .filter(p -> p.getCurrentValue() != null
                            && p.getCurrentValue().compareTo(BigDecimal.ZERO) > 0)
                    .map(p -> new MonthlyHoldingSnapshot(snap, p.getTicker(), p.getName(),
                            p.getAssetType(), p.getCurrentValue().setScale(2, RoundingMode.HALF_UP)))
                    .toList();
            holdingSnapshotRepository.saveAll(holdingSnaps);
        } catch (Exception e) {
            log.debug("Could not save monthly snapshot: {}", e.getMessage());
        }
    }

    /**
     * Get wealth development time-series: each month has a map of holding name → value.
     * Returns a list of maps, each with "month" (YYYY-MM) and one key per holding.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getWealthDevelopment() {
        Long userId = authHelper.getCurrentUserId();
        List<MonthlyHoldingSnapshot> all = holdingSnapshotRepository.findAllByUserId(userId);

        // Group by snapshot (month)
        Map<Long, List<MonthlyHoldingSnapshot>> bySnapshot = all.stream()
                .collect(Collectors.groupingBy(h -> h.getSnapshot().getId(),
                        LinkedHashMap::new, Collectors.toList()));

        List<Map<String, Object>> result = new ArrayList<>();
        for (var entry : bySnapshot.entrySet()) {
            List<MonthlyHoldingSnapshot> holdings = entry.getValue();
            if (holdings.isEmpty()) continue;
            MonthlySnapshot snap = holdings.get(0).getSnapshot();
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("month", String.format("%d-%02d", snap.getYear(), snap.getMonth()));
            for (MonthlyHoldingSnapshot h : holdings) {
                row.put(h.getName(), h.getCurrentValue());
            }
            result.add(row);
        }
        return result;
    }

    /**
     * Compute monthly portfolio returns from stored snapshots.
     * Return for month M = (value_M / value_(M-1)) - 1, expressed as percentage.
     * Year total is compounded: product of (1 + r_i) - 1.
     */
    @Transactional(readOnly = true)
    public List<MonthlyReturnDto> getMonthlyReturns() {
        List<MonthlySnapshot> snapshots = snapshotRepository.findByUserIdOrderByYearAscMonthAsc(authHelper.getCurrentUserId());
        if (snapshots.isEmpty()) return Collections.emptyList();

        // Group by year
        Map<Integer, List<MonthlySnapshot>> byYear = new LinkedHashMap<>();
        for (MonthlySnapshot s : snapshots) {
            byYear.computeIfAbsent(s.getYear(), k -> new ArrayList<>()).add(s);
        }

        // Build a flat list for prev-month lookups
        // Map (year*100 + month) → snapshot
        Map<Integer, MonthlySnapshot> snapMap = new LinkedHashMap<>();
        for (MonthlySnapshot s : snapshots) {
            snapMap.put(s.getYear() * 100 + s.getMonth(), s);
        }

        List<MonthlyReturnDto> result = new ArrayList<>();

        for (Map.Entry<Integer, List<MonthlySnapshot>> entry : byYear.entrySet()) {
            int year = entry.getKey();
            List<BigDecimal> monthReturns = new ArrayList<>(Collections.nCopies(12, null));
            BigDecimal compounded = BigDecimal.ONE;
            boolean hasAny = false;

            for (int m = 1; m <= 12; m++) {
                MonthlySnapshot current = snapMap.get(year * 100 + m);
                if (current == null) continue;

                // Find previous snapshot (previous month, or Dec of previous year)
                MonthlySnapshot prev = findPreviousSnapshot(snapMap, year, m);

                BigDecimal returnPct;
                if (prev != null && prev.getTotalValue().compareTo(BigDecimal.ZERO) > 0) {
                    returnPct = current.getTotalValue()
                            .divide(prev.getTotalValue(), 6, RoundingMode.HALF_UP)
                            .subtract(BigDecimal.ONE)
                            .multiply(BigDecimal.valueOf(100))
                            .setScale(2, RoundingMode.HALF_UP);
                } else if (current.getTotalCost().compareTo(BigDecimal.ZERO) > 0) {
                    // First ever snapshot — return relative to cost basis
                    returnPct = current.getTotalValue()
                            .divide(current.getTotalCost(), 6, RoundingMode.HALF_UP)
                            .subtract(BigDecimal.ONE)
                            .multiply(BigDecimal.valueOf(100))
                            .setScale(2, RoundingMode.HALF_UP);
                } else {
                    continue;
                }

                monthReturns.set(m - 1, returnPct);
                compounded = compounded.multiply(
                        BigDecimal.ONE.add(returnPct.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP))
                );
                hasAny = true;
            }

            if (!hasAny) continue;

            BigDecimal yearReturn = compounded.subtract(BigDecimal.ONE)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);

            result.add(new MonthlyReturnDto(year, yearReturn, monthReturns));
        }

        return result;
    }

    private MonthlySnapshot findPreviousSnapshot(Map<Integer, MonthlySnapshot> snapMap, int year, int month) {
        // Try previous month in the same year
        if (month > 1) {
            MonthlySnapshot prev = snapMap.get(year * 100 + (month - 1));
            if (prev != null) return prev;
        }
        // Try December of previous year
        MonthlySnapshot prev = snapMap.get((year - 1) * 100 + 12);
        if (prev != null) return prev;
        // Scan backwards to find closest prior snapshot
        for (int y = year; y >= year - 5; y--) {
            int startM = (y == year) ? month - 1 : 12;
            for (int m = startM; m >= 1; m--) {
                MonthlySnapshot s = snapMap.get(y * 100 + m);
                if (s != null) return s;
            }
        }
        return null;
    }

    /**
     * Compute sector allocation. For ETF/FUND positions, use Yahoo's sectorWeightings
     * to decompose the ETF value across sectors proportionally.
     */
    private Map<String, BigDecimal> computeSectorAllocation(
            List<PortfolioPositionDto> positions, BigDecimal totalValue,
            Map<String, EtfHoldingsDto> etfHoldingsMap) {

        Map<String, BigDecimal> sectorValues = new LinkedHashMap<>();

        if (totalValue.compareTo(BigDecimal.ZERO) <= 0) return sectorValues;

        for (PortfolioPositionDto p : positions) {
            BigDecimal posValue = p.getCurrentValue();
            if (posValue == null || posValue.compareTo(BigDecimal.ZERO) <= 0) continue;

            EtfHoldingsDto etfData = etfHoldingsMap.get(p.getTicker().toUpperCase());
            if (etfData != null && etfData.getSectorWeightings() != null && !etfData.getSectorWeightings().isEmpty()) {
                // Decompose ETF across its sector weightings
                for (Map.Entry<String, BigDecimal> sw : etfData.getSectorWeightings().entrySet()) {
                    BigDecimal sectorValue = posValue.multiply(sw.getValue());
                    sectorValues.merge(sw.getKey(), sectorValue, BigDecimal::add);
                }
            } else {
                // Non-ETF or no holdings data: use the position's own sector
                String sector = (p.getSector() != null && !p.getSector().isBlank()) ? p.getSector() : "Unassigned";
                sectorValues.merge(sector, posValue, BigDecimal::add);
            }
        }

        return toPercentageMap(sectorValues, totalValue);
    }

    /**
     * Compute region or country allocation. For ETF/FUND positions, use the top holdings'
     * resolved profiles to approximate geographic breakdown.
     *
     * Since Yahoo only provides the top 10 holdings (~30-40% coverage), we extrapolate:
     * the geographic distribution of the known holdings is assumed to be representative
     * of the full ETF. This avoids a misleading 60%+ "Other" bucket.
     */
    private Map<String, BigDecimal> computeGeographicAllocation(
            List<PortfolioPositionDto> positions, BigDecimal totalValue,
            Map<String, EtfHoldingsDto> etfHoldingsMap, String dimension) {

        Map<String, BigDecimal> geoValues = new LinkedHashMap<>();

        // Only profile Stocks and ETFs/Funds by region and country
        BigDecimal equityTotal = BigDecimal.ZERO;
        for (PortfolioPositionDto p : positions) {
            String type = p.getAssetType();
            if ("STOCK".equals(type) || "ETF".equals(type) || "FUND".equals(type)) {
                BigDecimal v = p.getCurrentValue();
                if (v != null) equityTotal = equityTotal.add(v);
            }
        }
        if (equityTotal.compareTo(BigDecimal.ZERO) <= 0) return geoValues;

        for (PortfolioPositionDto p : positions) {
            String assetType = p.getAssetType();
            if (!"STOCK".equals(assetType) && !"ETF".equals(assetType) && !"FUND".equals(assetType)) continue;

            BigDecimal posValue = p.getCurrentValue();
            if (posValue == null || posValue.compareTo(BigDecimal.ZERO) <= 0) continue;

            EtfHoldingsDto etfData = etfHoldingsMap.get(p.getTicker().toUpperCase());
            if (etfData != null && etfData.getHoldings() != null && !etfData.getHoldings().isEmpty()) {
                // First pass: compute relative distribution among known top holdings
                Map<String, BigDecimal> holdingDistribution = new LinkedHashMap<>();
                BigDecimal resolvedWeight = BigDecimal.ZERO;

                for (EtfHoldingsDto.Holding h : etfData.getHoldings()) {
                    String value = "region".equals(dimension) ? h.getRegion() : h.getCountry();
                    if (value != null && !value.isBlank()) {
                        holdingDistribution.merge(value, h.getWeight(), BigDecimal::add);
                        resolvedWeight = resolvedWeight.add(h.getWeight());
                    }
                }

                if (resolvedWeight.compareTo(BigDecimal.ZERO) > 0) {
                    // Extrapolate: scale up to cover the full ETF value
                    // e.g., if top 10 = 36% and 95% of those are US, allocate 95% of full ETF to US
                    for (Map.Entry<String, BigDecimal> entry : holdingDistribution.entrySet()) {
                        BigDecimal fraction = entry.getValue()
                                .divide(resolvedWeight, 6, RoundingMode.HALF_UP);
                        geoValues.merge(entry.getKey(), posValue.multiply(fraction), BigDecimal::add);
                    }
                } else {
                    // All holdings had unknown geography — fall back to position-level
                    String value = "region".equals(dimension) ? p.getRegion() : p.getCountry();
                    if (value == null || value.isBlank()) value = "Unassigned";
                    geoValues.merge(value, posValue, BigDecimal::add);
                }
            } else {
                // Non-ETF or no holdings data: use the position's own region/country
                String value = "region".equals(dimension) ? p.getRegion() : p.getCountry();
                if (value == null || value.isBlank()) value = "Unassigned";
                geoValues.merge(value, posValue, BigDecimal::add);
            }
        }

        return toPercentageMap(geoValues, equityTotal);
    }

    /** Convert absolute values to percentage map, sorted descending. */
    private Map<String, BigDecimal> toPercentageMap(Map<String, BigDecimal> valueMap, BigDecimal totalValue) {
        Map<String, BigDecimal> result = new LinkedHashMap<>();
        valueMap.entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .forEach(e -> {
                    BigDecimal pct = e.getValue()
                            .divide(totalValue, 4, RoundingMode.HALF_UP)
                            .multiply(BigDecimal.valueOf(100))
                            .setScale(1, RoundingMode.HALF_UP);
                    if (pct.compareTo(BigDecimal.ZERO) > 0) {
                        result.put(e.getKey(), pct);
                    }
                });
        return result;
    }
}
