package com.portfolio.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Database-backed cache for stock/asset profile data (country, region, sector, industry).
 * Avoids repeated Yahoo Finance API calls since this data changes very rarely.
 */
@Entity
@Table(name = "stock_profiles")
public class StockProfile {

    @Id
    @Column(length = 20)
    private String ticker;

    @Column(length = 80)
    private String country;

    @Column(length = 50)
    private String region;

    @Column(length = 80)
    private String sector;

    @Column(length = 120)
    private String industry;

    @Column(length = 60)
    private String exchange;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onSave() {
        updatedAt = LocalDateTime.now();
    }

    public StockProfile() {}

    public StockProfile(String ticker) {
        this.ticker = ticker;
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

    public String getExchange() { return exchange; }
    public void setExchange(String exchange) { this.exchange = exchange; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
