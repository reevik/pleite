package com.portfolio.dto;

import com.portfolio.model.Transaction;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class TransactionDto {

    private Long id;
    private Long investmentId;
    private String ticker;
    private String name;
    private String type;
    private BigDecimal quantity;
    private BigDecimal price;
    private LocalDate transactionDate;
    private BigDecimal fees;
    private BigDecimal realizedGainLoss;
    private BigDecimal costBasis;
    private String notes;
    private LocalDateTime createdAt;

    public static TransactionDto from(Transaction tx) {
        TransactionDto dto = new TransactionDto();
        dto.id = tx.getId();
        dto.investmentId = tx.getInvestment().getId();
        dto.ticker = tx.getInvestment().getTicker();
        dto.name = tx.getInvestment().getName();
        dto.type = tx.getType().name();
        dto.quantity = tx.getQuantity();
        dto.price = tx.getPrice();
        dto.transactionDate = tx.getTransactionDate();
        dto.fees = tx.getFees();
        dto.realizedGainLoss = tx.getRealizedGainLoss();
        dto.costBasis = tx.getCostBasis();
        dto.notes = tx.getNotes();
        dto.createdAt = tx.getCreatedAt();
        return dto;
    }

    // Getters
    public Long getId() { return id; }
    public Long getInvestmentId() { return investmentId; }
    public String getTicker() { return ticker; }
    public String getName() { return name; }
    public String getType() { return type; }
    public BigDecimal getQuantity() { return quantity; }
    public BigDecimal getPrice() { return price; }
    public LocalDate getTransactionDate() { return transactionDate; }
    public BigDecimal getFees() { return fees; }
    public BigDecimal getRealizedGainLoss() { return realizedGainLoss; }
    public BigDecimal getCostBasis() { return costBasis; }
    public String getNotes() { return notes; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
