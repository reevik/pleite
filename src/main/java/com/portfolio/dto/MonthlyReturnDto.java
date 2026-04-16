package com.portfolio.dto;

import java.math.BigDecimal;
import java.util.List;

public class MonthlyReturnDto {

    private int year;
    private BigDecimal yearReturnPercent;   // compounded annual return
    private List<BigDecimal> months;        // 12 entries (index 0 = Jan), null = no data

    public MonthlyReturnDto() {}

    public MonthlyReturnDto(int year, BigDecimal yearReturnPercent, List<BigDecimal> months) {
        this.year = year;
        this.yearReturnPercent = yearReturnPercent;
        this.months = months;
    }

    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }

    public BigDecimal getYearReturnPercent() { return yearReturnPercent; }
    public void setYearReturnPercent(BigDecimal yearReturnPercent) { this.yearReturnPercent = yearReturnPercent; }

    public List<BigDecimal> getMonths() { return months; }
    public void setMonths(List<BigDecimal> months) { this.months = months; }
}
