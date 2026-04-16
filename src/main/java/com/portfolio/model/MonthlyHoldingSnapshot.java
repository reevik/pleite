package com.portfolio.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

/**
 * Per-holding monthly value snapshot for wealth development tracking.
 * Linked to the parent MonthlySnapshot for the same month/user.
 */
@Entity
@Table(name = "monthly_holding_snapshots",
       uniqueConstraints = @UniqueConstraint(columnNames = {"snapshot_id", "ticker"}))
public class MonthlyHoldingSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "snapshot_id", nullable = false)
    private MonthlySnapshot snapshot;

    @Column(nullable = false, length = 20)
    private String ticker;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "asset_type", nullable = false, length = 20)
    private String assetType;

    @Column(name = "current_value", nullable = false, precision = 18, scale = 2)
    private BigDecimal currentValue;

    public MonthlyHoldingSnapshot() {}

    public MonthlyHoldingSnapshot(MonthlySnapshot snapshot, String ticker, String name,
                                   String assetType, BigDecimal currentValue) {
        this.snapshot = snapshot;
        this.ticker = ticker;
        this.name = name;
        this.assetType = assetType;
        this.currentValue = currentValue;
    }

    public Long getId() { return id; }
    public MonthlySnapshot getSnapshot() { return snapshot; }
    public void setSnapshot(MonthlySnapshot snapshot) { this.snapshot = snapshot; }
    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getAssetType() { return assetType; }
    public void setAssetType(String assetType) { this.assetType = assetType; }
    public BigDecimal getCurrentValue() { return currentValue; }
    public void setCurrentValue(BigDecimal currentValue) { this.currentValue = currentValue; }
}
