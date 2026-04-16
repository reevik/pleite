package com.portfolio.repository;

import com.portfolio.model.MonthlyHoldingSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface MonthlyHoldingSnapshotRepository extends JpaRepository<MonthlyHoldingSnapshot, Long> {

    @Transactional
    @Modifying
    void deleteBySnapshotId(Long snapshotId);

    @Query("SELECT h FROM MonthlyHoldingSnapshot h JOIN h.snapshot s " +
           "WHERE s.user.id = :userId ORDER BY s.year ASC, s.month ASC")
    List<MonthlyHoldingSnapshot> findAllByUserId(@Param("userId") Long userId);
}
