package com.portfolio.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import com.portfolio.model.User;

@Entity
@Table(name = "watchlist",
       uniqueConstraints = @UniqueConstraint(columnNames = {"ticker", "user_id"}))
public class WatchlistItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Ticker symbol is required")
    @Column(nullable = false, length = 20)
    private String ticker;

    @Column(length = 200)
    private String name;

    @Column(name = "asset_type", length = 20)
    private String assetType;

    @Column(length = 20)
    private String exchange;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "added_at", updatable = false)
    private LocalDateTime addedAt;

    @PrePersist
    protected void onCreate() {
        addedAt = LocalDateTime.now();
        if (ticker != null) ticker = ticker.toUpperCase().trim();
    }

    // Constructors
    public WatchlistItem() {}

    public WatchlistItem(String ticker, String name, String assetType, String exchange) {
        this.ticker = ticker;
        this.name = name;
        this.assetType = assetType;
        this.exchange = exchange;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getAssetType() { return assetType; }
    public void setAssetType(String assetType) { this.assetType = assetType; }

    public String getExchange() { return exchange; }
    public void setExchange(String exchange) { this.exchange = exchange; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public LocalDateTime getAddedAt() { return addedAt; }
}
