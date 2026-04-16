package com.portfolio.service;

import com.portfolio.dto.PdfParseResultDto;
import com.portfolio.dto.PdfParseResultDto.ParsedTransactionDto;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PdfParserService {

    private static final Logger log = LoggerFactory.getLogger(PdfParserService.class);

    // Common patterns for brokerage statements
    // Matches lines like: "BUY 10 AAPL @ 150.00 2024-01-15"
    private static final Pattern TRANSACTION_PATTERN = Pattern.compile(
            "(?i)(BUY|SELL|KAUF|VERKAUF|PURCHASE|BOUGHT|SOLD)\\s+" +
            "(\\d+[.,]?\\d*)\\s+" +           // quantity
            "([A-Z0-9]{1,10})\\s+" +           // ticker
            "(?:@|at|zu|à)?\\s*" +
            "(\\d+[.,]\\d{2,4})\\s*" +         // price
            "(?:EUR|USD|GBP|CHF)?\\s*" +
            "(\\d{2,4}[./-]\\d{2}[./-]\\d{2,4})?" // optional date
    );

    // Pattern for tabular formats: ISIN/Ticker | Name | Quantity | Price | Date
    private static final Pattern TABLE_PATTERN = Pattern.compile(
            "([A-Z]{2}[A-Z0-9]{10}|[A-Z0-9]{1,10})\\s+" + // ISIN or Ticker
            "([A-Za-z0-9 .&-]{3,50})\\s+" +                // Name
            "(\\d+[.,]?\\d*)\\s+" +                         // Quantity
            "(\\d+[.,]\\d{2,4})"                            // Price
    );

    // Date pattern
    private static final Pattern DATE_PATTERN = Pattern.compile(
            "(\\d{2}[./-]\\d{2}[./-]\\d{2,4}|\\d{4}[./-]\\d{2}[./-]\\d{2})"
    );

    public PdfParseResultDto parsePdf(MultipartFile file) throws IOException {
        List<ParsedTransactionDto> transactions = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);

            log.info("Extracted {} characters from PDF: {}", text.length(), file.getOriginalFilename());

            String[] lines = text.split("\\r?\\n");

            for (String line : lines) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.length() < 10) continue;

                // Try transaction pattern first
                Matcher txMatcher = TRANSACTION_PATTERN.matcher(trimmed);
                if (txMatcher.find()) {
                    ParsedTransactionDto tx = new ParsedTransactionDto();
                    tx.setType(normalizeType(txMatcher.group(1)));
                    tx.setQuantity(txMatcher.group(2).replace(",", "."));
                    tx.setTicker(txMatcher.group(3));
                    tx.setPrice(txMatcher.group(4).replace(",", "."));
                    tx.setDate(txMatcher.group(5));
                    tx.setRawLine(trimmed);
                    transactions.add(tx);
                    continue;
                }

                // Try table pattern
                Matcher tableMatcher = TABLE_PATTERN.matcher(trimmed);
                if (tableMatcher.find()) {
                    ParsedTransactionDto tx = new ParsedTransactionDto();
                    String tickerOrIsin = tableMatcher.group(1);
                    tx.setTicker(tickerOrIsin.length() == 12 ? tickerOrIsin : tickerOrIsin);
                    tx.setName(tableMatcher.group(2).trim());
                    tx.setQuantity(tableMatcher.group(3).replace(",", "."));
                    tx.setPrice(tableMatcher.group(4).replace(",", "."));
                    tx.setType("BUY");

                    // Try to find date in the same line
                    Matcher dateMatcher = DATE_PATTERN.matcher(trimmed);
                    if (dateMatcher.find()) {
                        tx.setDate(dateMatcher.group(1));
                    }

                    tx.setRawLine(trimmed);
                    transactions.add(tx);
                }
            }

            if (transactions.isEmpty()) {
                warnings.add("No transactions could be automatically detected in this PDF. " +
                        "The parser looks for patterns like 'BUY 10 AAPL @ 150.00' or tabular ISIN/ticker data. " +
                        "You may need to enter these transactions manually.");

                // Add raw text excerpt for user reference
                if (text.length() > 200) {
                    warnings.add("First 500 chars of extracted text: " +
                            text.substring(0, Math.min(500, text.length())));
                }
            }

        } catch (Exception e) {
            log.error("PDF parsing error: {}", e.getMessage(), e);
            warnings.add("Error parsing PDF: " + e.getMessage());
        }

        return new PdfParseResultDto(transactions, warnings);
    }

    private String normalizeType(String type) {
        return switch (type.toUpperCase()) {
            case "BUY", "KAUF", "PURCHASE", "BOUGHT" -> "BUY";
            case "SELL", "VERKAUF", "SOLD" -> "SELL";
            default -> type.toUpperCase();
        };
    }
}
