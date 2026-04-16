package com.portfolio.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class PortfolioSummaryDto {

    private BigDecimal totalValue;
    private BigDecimal totalCost;
    private BigDecimal totalGainLoss;
    private BigDecimal totalGainLossPercent;
    private BigDecimal dayChange;
    private BigDecimal dayChangePercent;
    private BigDecimal totalRealizedGainLoss;
    private int positionCount;
    private List<PortfolioPositionDto> positions;
    private Map<String, BigDecimal> allocationByType;
    private Map<String, BigDecimal> allocationByRegion;
    private Map<String, BigDecimal> allocationByCountry;
    private Map<String, BigDecimal> allocationBySector;

    // Getters and Setters
    public BigDecimal getTotalValue() { return totalValue; }
    public void setTotalValue(BigDecimal totalValue) { this.totalValue = totalValue; }

    public BigDecimal getTotalCost() { return totalCost; }
    public void setTotalCost(BigDecimal totalCost) { this.totalCost = totalCost; }

    public BigDecimal getTotalGainLoss() { return totalGainLoss; }
    public void setTotalGainLoss(BigDecimal totalGainLoss) { this.totalGainLoss = totalGainLoss; }

    public BigDecimal getTotalGainLossPercent() { return totalGainLossPercent; }
    public void setTotalGainLossPercent(BigDecimal totalGainLossPercent) { this.totalGainLossPercent = totalGainLossPercent; }

    public BigDecimal getDayChange() { return dayChange; }
    public void setDayChange(BigDecimal dayChange) { this.dayChange = dayChange; }

    public BigDecimal getDayChangePercent() { return dayChangePercent; }
    public void setDayChangePercent(BigDecimal dayChangePercent) { this.dayChangePercent = dayChangePercent; }

    public BigDecimal getTotalRealizedGainLoss() { return totalRealizedGainLoss; }
    public void setTotalRealizedGainLoss(BigDecimal totalRealizedGainLoss) { this.totalRealizedGainLoss = totalRealizedGainLoss; }

    public int getPositionCount() { return positionCount; }
    public void setPositionCount(int positionCount) { this.positionCount = positionCount; }

    public List<PortfolioPositionDto> getPositions() { return positions; }
    public void setPositions(List<PortfolioPositionDto> positions) { this.positions = positions; }

    public Map<String, BigDecimal> getAllocationByType() { return allocationByType; }
    public void setAllocationByType(Map<String, BigDecimal> allocationByType) { this.allocationByType = allocationByType; }

    public Map<String, BigDecimal> getAllocationByRegion() { return allocationByRegion; }
    public void setAllocationByRegion(Map<String, BigDecimal> allocationByRegion) { this.allocationByRegion = allocationByRegion; }

    public Map<String, BigDecimal> getAllocationByCountry() { return allocationByCountry; }
    public void setAllocationByCountry(Map<String, BigDecimal> allocationByCountry) { this.allocationByCountry = allocationByCountry; }

    public Map<String, BigDecimal> getAllocationBySector() { return allocationBySector; }
    public void setAllocationBySector(Map<String, BigDecimal> allocationBySector) { this.allocationBySector = allocationBySector; }
}
