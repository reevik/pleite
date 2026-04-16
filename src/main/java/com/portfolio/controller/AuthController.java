package com.portfolio.controller;

import com.portfolio.model.Country;
import com.portfolio.model.User;
import com.portfolio.repository.CountryRepository;
import com.portfolio.repository.UserRepository;
import com.portfolio.service.JwtService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final CountryRepository countryRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(UserRepository userRepository, CountryRepository countryRepository,
                          PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.countryRepository = countryRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    // --- DTOs as inner records ---

    public record LoginRequest(
            @NotBlank String email,
            @NotBlank String password
    ) {}

    public record SignupRequest(
            @NotBlank @Email String email,
            @NotBlank @Size(min = 4, message = "Password must be at least 4 characters") String password,
            @NotBlank String firstName,
            @NotBlank String lastName,
            String country
    ) {}

    public record AuthResponse(String token, UserInfo user) {}

    public record UserInfo(Long id, String email, String firstName, String lastName, String country) {}

    // --- Endpoints ---

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        User user = userRepository.findByEmail(req.email().toLowerCase().trim()).orElse(null);
        if (user == null || !passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid email or password"));
        }

        String token = jwtService.generateToken(user.getId(), user.getEmail());
        return ResponseEntity.ok(new AuthResponse(token, toUserInfo(user)));
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest req) {
        String email = req.email().toLowerCase().trim();
        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email already registered"));
        }

        User user = new User(
                email,
                passwordEncoder.encode(req.password()),
                req.firstName().trim(),
                req.lastName().trim(),
                req.country() != null ? req.country().trim() : null
        );
        userRepository.save(user);

        String token = jwtService.generateToken(user.getId(), user.getEmail());
        return ResponseEntity.ok(new AuthResponse(token, toUserInfo(user)));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        Long userId = (Long) authentication.getPrincipal();
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not found"));
        }
        return ResponseEntity.ok(toUserInfo(user));
    }

    @GetMapping("/countries")
    public List<Country> getCountries() {
        return countryRepository.findAllByOrderByNameAsc();
    }

    private UserInfo toUserInfo(User user) {
        return new UserInfo(user.getId(), user.getEmail(),
                user.getFirstName(), user.getLastName(), user.getCountry());
    }
}
