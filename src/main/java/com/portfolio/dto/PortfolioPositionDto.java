package com.portfolio.dto;

import com.portfolio.model.Investment;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

public class PortfolioPositionDto {

    private Long id;
    private String ticker;
    private String name;
    private BigDecimal quantity;
    private BigDecimal purchasePrice;
    private LocalDate purchaseDate;
    private String assetType;
    private String currency;
    private String notes;
    private String region;
    private String country;
    private String sector;

    // Live market data
    private BigDecimal currentPrice;
    private BigDecimal totalCost;
    private BigDecimal currentValue;
    private BigDecimal gainLoss;
    private BigDecimal gainLossPercent;
    private BigDecimal dayChange;
    private BigDecimal dayChangePercent;
    private BigDecimal realizedGainLoss;

    public static PortfolioPositionDto from(Investment inv, BigDecimal currentPrice,
                                             BigDecimal dayChange, BigDecimal dayChangePercent) {
        return from(inv, currentPrice, dayChange, dayChangePercent, BigDecimal.ZERO);
    }

    public static PortfolioPositionDto from(Investment inv, BigDecimal currentPrice,
                                             BigDecimal dayChange, BigDecimal dayChangePercent,
                                             BigDecimal realizedGainLoss) {
        PortfolioPositionDto dto = new PortfolioPositionDto();
        dto.id = inv.getId();
        dto.ticker = inv.getTicker();
        dto.name = inv.getName();
        dto.quantity = inv.getQuantity();
        dto.purchasePrice = inv.getPurchasePrice();
        dto.purchaseDate = inv.getPurchaseDate();
        dto.assetType = inv.getAssetType().name();
        dto.currency = inv.getCurrency();
        dto.notes = inv.getNotes();
        dto.region = inv.getRegion();
        dto.country = inv.getCountry();
        dto.sector = inv.getSector();

        dto.realizedGainLoss = realizedGainLoss != null ? realizedGainLoss : BigDecimal.ZERO;

        // Cash holdings: value is fixed at quantity * purchasePrice, no market quotes
        if (inv.getAssetType() == Investment.AssetType.CASH) {
            dto.currentPrice = inv.getPurchasePrice();
            dto.dayChange = BigDecimal.ZERO;
            dto.dayChangePercent = BigDecimal.ZERO;
            dto.totalCost = inv.getQuantity().multiply(inv.getPurchasePrice()).setScale(2, RoundingMode.HALF_UP);
            dto.currentValue = dto.totalCost;
            dto.gainLoss = BigDecimal.ZERO;
            dto.gainLossPercent = BigDecimal.ZERO;
            return dto;
        }

        dto.currentPrice = currentPrice;
        dto.dayChange = dayChange;
        dto.dayChangePercent = dayChangePercent;

        dto.totalCost = inv.getQuantity().multiply(inv.getPurchasePrice()).setScale(2, RoundingMode.HALF_UP);

        if (currentPrice != null) {
            dto.currentValue = inv.getQuantity().multiply(currentPrice).setScale(2, RoundingMode.HALF_UP);
            dto.gainLoss = dto.currentValue.subtract(dto.totalCost).setScale(2, RoundingMode.HALF_UP);
            if (dto.totalCost.compareTo(BigDecimal.ZERO) > 0) {
                dto.gainLossPercent = dto.gainLoss.divide(dto.totalCost, 6, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP);
            }
        } else {
            dto.currentValue = dto.totalCost;
            dto.gainLoss = BigDecimal.ZERO;
            dto.gainLossPercent = BigDecimal.ZERO;
        }

        return dto;
    }

    // Getters
    public Long getId() { return id; }
    public String getTicker() { return ticker; }
    public String getName() { return name; }
    public BigDecimal getQuantity() { return quantity; }
    public BigDecimal getPurchasePrice() { return purchasePrice; }
    public LocalDate getPurchaseDate() { return purchaseDate; }
    public String getAssetType() { return assetType; }
    public String getCurrency() { return currency; }
    public String getNotes() { return notes; }
    public BigDecimal getCurrentPrice() { return currentPrice; }
    public BigDecimal getTotalCost() { return totalCost; }
    public BigDecimal getCurrentValue() { return currentValue; }
    public BigDecimal getGainLoss() { return gainLoss; }
    public BigDecimal getGainLossPercent() { return gainLossPercent; }
    public BigDecimal getDayChange() { return dayChange; }
    public BigDecimal getDayChangePercent() { return dayChangePercent; }
    public String getRegion() { return region; }
    public String getCountry() { return country; }
    public String getSector() { return sector; }
    public BigDecimal getRealizedGainLoss() { return realizedGainLoss; }
}
