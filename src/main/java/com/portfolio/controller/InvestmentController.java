package com.portfolio.controller;

import com.portfolio.dto.MonthlyReturnDto;
import com.portfolio.dto.PortfolioSummaryDto;
import com.portfolio.dto.TradeRequestDto;
import com.portfolio.dto.TransactionDto;
import com.portfolio.dto.UndoResultDto;
import com.portfolio.model.Investment;
import com.portfolio.service.InvestmentService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/investments")
public class InvestmentController {

    private final InvestmentService service;

    public InvestmentController(InvestmentService service) {
        this.service = service;
    }

    @GetMapping
    public List<Investment> getAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Investment> getById(@PathVariable Long id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Investment create(@Valid @RequestBody Investment investment) {
        return service.create(investment);
    }

    @PostMapping("/batch")
    public List<Investment> createBatch(@Valid @RequestBody List<Investment> investments) {
        return service.createAll(investments);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Investment> update(@PathVariable Long id,
                                              @Valid @RequestBody Investment investment) {
        try {
            return ResponseEntity.ok(service.update(id, investment));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/summary")
    public PortfolioSummaryDto getPortfolioSummary() {
        return service.getPortfolioSummary();
    }

    // ---- Trading ----

    @PostMapping("/{id}/buy")
    public ResponseEntity<TransactionDto> buyMore(@PathVariable Long id,
                                                   @Valid @RequestBody TradeRequestDto req) {
        try {
            return ResponseEntity.ok(service.buyMore(id, req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/{id}/sell")
    public ResponseEntity<?> sell(@PathVariable Long id,
                                  @Valid @RequestBody TradeRequestDto req) {
        try {
            return ResponseEntity.ok(service.sell(id, req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}/transactions")
    public List<TransactionDto> getTransactions(@PathVariable Long id) {
        return service.getTransactions(id);
    }

    @GetMapping("/transactions")
    public List<TransactionDto> getAllTransactions() {
        return service.getAllTransactions();
    }

    @PostMapping("/transactions/{txId}/undo")
    public ResponseEntity<?> undoTransaction(@PathVariable Long txId) {
        try {
            return ResponseEntity.ok(service.undoTransaction(txId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/monthly-returns")
    public List<MonthlyReturnDto> getMonthlyReturns() {
        return service.getMonthlyReturns();
    }

    @GetMapping("/wealth-development")
    public List<Map<String, Object>> getWealthDevelopment() {
        return service.getWealthDevelopment();
    }
}
