package com.portfolio.repository;

import com.portfolio.model.Investment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvestmentRepository extends JpaRepository<Investment, Long> {

    List<Investment> findByTickerIgnoreCase(String ticker);

    List<Investment> findByAssetType(Investment.AssetType assetType);

    @Query("SELECT DISTINCT i.ticker FROM Investment i")
    List<String> findDistinctTickers();

    List<Investment> findAllByOrderByPurchaseDateDesc();

    // User-scoped queries
    List<Investment> findByUserIdOrderByPurchaseDateDesc(Long userId);

    List<Investment> findByUserId(Long userId);

    Optional<Investment> findByIdAndUserId(Long id, Long userId);
}
