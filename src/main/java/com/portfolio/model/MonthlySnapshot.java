package com.portfolio.model;

import jakarta.persistence.*;
import com.portfolio.model.User;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Stores end-of-month (or latest-known) portfolio value for computing
 * month-over-month returns. Upserted on every portfolio summary load.
 */
@Entity
@Table(name = "monthly_snapshots",
       uniqueConstraints = @UniqueConstraint(columnNames = {"snap_year", "snap_month", "user_id"}))
public class MonthlySnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "snap_year", nullable = false)
    private int year;

    @Column(name = "snap_month", nullable = false)
    private int month; // 1–12

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "total_value", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalValue;

    @Column(name = "total_cost", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalCost;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onSave() {
        updatedAt = LocalDateTime.now();
    }

    public MonthlySnapshot() {}

    public MonthlySnapshot(int year, int month, BigDecimal totalValue, BigDecimal totalCost) {
        this.year = year;
        this.month = month;
        this.totalValue = totalValue;
        this.totalCost = totalCost;
    }

    // Getters and setters
    public Long getId() { return id; }
    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }
    public int getMonth() { return month; }
    public void setMonth(int month) { this.month = month; }
    public BigDecimal getTotalValue() { return totalValue; }
    public void setTotalValue(BigDecimal totalValue) { this.totalValue = totalValue; }
    public BigDecimal getTotalCost() { return totalCost; }
    public void setTotalCost(BigDecimal totalCost) { this.totalCost = totalCost; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
