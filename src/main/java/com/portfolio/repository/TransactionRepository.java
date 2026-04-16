package com.portfolio.repository;

import com.portfolio.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByInvestmentIdOrderByTransactionDateDesc(Long investmentId);

    List<Transaction> findByInvestmentId(Long investmentId);

    /** Sum of all realized gains/losses for a given investment. */
    @Query("SELECT COALESCE(SUM(t.realizedGainLoss), 0) FROM Transaction t WHERE t.investment.id = :investmentId")
    BigDecimal sumRealizedGainLossByInvestmentId(Long investmentId);

    /** Sum of all realized gains/losses across all investments. */
    @Query("SELECT COALESCE(SUM(t.realizedGainLoss), 0) FROM Transaction t")
    BigDecimal sumAllRealizedGainLoss();

    // User-scoped queries
    @Query("SELECT COALESCE(SUM(t.realizedGainLoss), 0) FROM Transaction t WHERE t.investment.user.id = :userId")
    BigDecimal sumAllRealizedGainLossByUserId(Long userId);

    @Query("SELECT t FROM Transaction t WHERE t.investment.user.id = :userId ORDER BY t.transactionDate DESC")
    List<Transaction> findAllByUserId(Long userId);

    /** All transactions for an investment, ordered by ID (creation order) ascending. */
    List<Transaction> findByInvestmentIdOrderByIdAsc(Long investmentId);
}
