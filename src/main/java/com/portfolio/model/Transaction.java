package com.portfolio.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "investment_id", nullable = false)
    private Investment investment;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "VARCHAR(10)")
    private Type type;

    @NotNull
    @DecimalMin(value = "0.0001")
    @Column(nullable = false, precision = 18, scale = 6)
    private BigDecimal quantity;

    @NotNull
    @DecimalMin(value = "0.0001")
    @Column(nullable = false, precision = 18, scale = 4)
    private BigDecimal price;

    @NotNull
    @Column(name = "transaction_date", nullable = false)
    private LocalDate transactionDate;

    @Column(precision = 18, scale = 4)
    private BigDecimal fees = BigDecimal.ZERO;

    /** Realized gain/loss for SELL transactions (computed at sell time using avg cost basis). */
    @Column(name = "realized_gain_loss", precision = 18, scale = 4)
    private BigDecimal realizedGainLoss;

    /** The average cost basis at the time of this transaction. */
    @Column(name = "cost_basis", precision = 18, scale = 4)
    private BigDecimal costBasis;

    @Column(length = 500)
    private String notes;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum Type { BUY, SELL }

    // Constructors
    public Transaction() {}

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Investment getInvestment() { return investment; }
    public void setInvestment(Investment investment) { this.investment = investment; }

    public Type getType() { return type; }
    public void setType(Type type) { this.type = type; }

    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public LocalDate getTransactionDate() { return transactionDate; }
    public void setTransactionDate(LocalDate transactionDate) { this.transactionDate = transactionDate; }

    public BigDecimal getFees() { return fees; }
    public void setFees(BigDecimal fees) { this.fees = fees; }

    public BigDecimal getRealizedGainLoss() { return realizedGainLoss; }
    public void setRealizedGainLoss(BigDecimal realizedGainLoss) { this.realizedGainLoss = realizedGainLoss; }

    public BigDecimal getCostBasis() { return costBasis; }
    public void setCostBasis(BigDecimal costBasis) { this.costBasis = costBasis; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
