package com.portfolio.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public class TradeRequestDto {

    @NotNull(message = "Quantity is required")
    @DecimalMin(value = "0.0001", message = "Quantity must be positive")
    private BigDecimal quantity;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.0001", message = "Price must be positive")
    private BigDecimal price;

    @NotNull(message = "Date is required")
    private LocalDate date;

    private BigDecimal fees;
    private String notes;

    /** Optional: the cash position to debit (buy) or credit (sell). */
    private Long cashInvestmentId;

    // Getters and setters
    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public BigDecimal getFees() { return fees; }
    public void setFees(BigDecimal fees) { this.fees = fees; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Long getCashInvestmentId() { return cashInvestmentId; }
    public void setCashInvestmentId(Long cashInvestmentId) { this.cashInvestmentId = cashInvestmentId; }
}
