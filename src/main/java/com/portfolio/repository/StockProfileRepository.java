package com.portfolio.repository;

import com.portfolio.model.StockProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface StockProfileRepository extends JpaRepository<StockProfile, String> {

    List<StockProfile> findByTickerIn(List<String> tickers);

    /**
     * Atomic upsert using H2 MERGE to avoid race-condition duplicate key errors.
     * COALESCE keeps existing non-null values when the new value is null.
     */
    @Modifying
    @Transactional
    @Query(nativeQuery = true, value =
            "MERGE INTO stock_profiles (ticker, country, region, sector, industry, exchange, updated_at) " +
            "KEY (ticker) " +
            "VALUES (:ticker, " +
            "  COALESCE(:country, (SELECT sp.country FROM stock_profiles sp WHERE sp.ticker = :ticker)), " +
            "  COALESCE(:region, (SELECT sp.region FROM stock_profiles sp WHERE sp.ticker = :ticker)), " +
            "  COALESCE(:sector, (SELECT sp.sector FROM stock_profiles sp WHERE sp.ticker = :ticker)), " +
            "  COALESCE(:industry, (SELECT sp.industry FROM stock_profiles sp WHERE sp.ticker = :ticker)), " +
            "  COALESCE(:exchange, (SELECT sp.exchange FROM stock_profiles sp WHERE sp.ticker = :ticker)), " +
            "  CURRENT_TIMESTAMP)")
    void upsert(@Param("ticker") String ticker,
                @Param("country") String country,
                @Param("region") String region,
                @Param("sector") String sector,
                @Param("industry") String industry,
                @Param("exchange") String exchange);
}
