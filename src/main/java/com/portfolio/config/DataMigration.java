package com.portfolio.config;

import com.portfolio.model.User;
import com.portfolio.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Seeds the admin user on first run and migrates any existing data
 * (investments, watchlist, snapshots) that have no user_id to the admin account.
 */
@Component
@Order(2) // Run after SchemaFixMigration
public class DataMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataMigration.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbc;

    public DataMigration(UserRepository userRepository, PasswordEncoder passwordEncoder,
                         JdbcTemplate jdbc) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        // 1. Ensure admin user exists (also migrate old email if needed)
        User admin = userRepository.findByEmail("admin@folio.app").orElse(null);
        if (admin == null) {
            // Check for old admin email and rename
            admin = userRepository.findByEmail("admin@folio.local").orElse(null);
            if (admin != null) {
                admin.setEmail("admin@folio.app");
                admin = userRepository.save(admin);
                log.info("Migrated admin email to admin@folio.app");
            } else {
                admin = new User("admin@folio.app", passwordEncoder.encode("admin"),
                        "Admin", "User", "");
                admin = userRepository.save(admin);
                log.info("Created default admin user (email: admin@folio.app, password: admin)");
            }
        }

        Long adminId = admin.getId();

        // 2. Migrate orphaned data (null user_id) to admin
        try {
            int investments = jdbc.update("UPDATE investments SET user_id = ? WHERE user_id IS NULL", adminId);
            if (investments > 0) log.info("Migrated {} investments to admin user", investments);

            int watchlist = jdbc.update("UPDATE watchlist SET user_id = ? WHERE user_id IS NULL", adminId);
            if (watchlist > 0) log.info("Migrated {} watchlist items to admin user", watchlist);

            int snapshots = jdbc.update("UPDATE monthly_snapshots SET user_id = ? WHERE user_id IS NULL", adminId);
            if (snapshots > 0) log.info("Migrated {} monthly snapshots to admin user", snapshots);
        } catch (Exception e) {
            log.warn("Data migration skipped: {}", e.getMessage());
        }

        // 3. Clear stale stock profiles that have no country (so exchange-based enrichment re-runs)
        try {
            int cleared = jdbc.update(
                    "DELETE FROM stock_profiles WHERE country IS NULL OR country = ''");
            if (cleared > 0) log.info("Cleared {} incomplete stock profiles for re-enrichment", cleared);
        } catch (Exception e) {
            log.debug("stock_profiles cleanup skipped: {}", e.getMessage());
        }
    }
}
