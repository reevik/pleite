package com.portfolio.repository;

import com.portfolio.model.MonthlySnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MonthlySnapshotRepository extends JpaRepository<MonthlySnapshot, Long> {

    Optional<MonthlySnapshot> findByYearAndMonth(int year, int month);

    List<MonthlySnapshot> findAllByOrderByYearAscMonthAsc();

    List<MonthlySnapshot> findByYearOrderByMonthAsc(int year);

    // User-scoped queries
    Optional<MonthlySnapshot> findByYearAndMonthAndUserId(int year, int month, Long userId);

    List<MonthlySnapshot> findByUserIdOrderByYearAscMonthAsc(Long userId);
}
