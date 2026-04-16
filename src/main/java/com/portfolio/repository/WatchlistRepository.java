package com.portfolio.repository;

import com.portfolio.model.WatchlistItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WatchlistRepository extends JpaRepository<WatchlistItem, Long> {

    List<WatchlistItem> findAllByOrderByAddedAtDesc();

    Optional<WatchlistItem> findByTickerIgnoreCase(String ticker);

    boolean existsByTickerIgnoreCase(String ticker);

    // User-scoped queries
    List<WatchlistItem> findByUserIdOrderByAddedAtDesc(Long userId);

    boolean existsByTickerIgnoreCaseAndUserId(String ticker, Long userId);

    Optional<WatchlistItem> findByIdAndUserId(Long id, Long userId);
}
