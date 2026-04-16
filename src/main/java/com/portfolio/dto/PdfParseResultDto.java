package com.portfolio.dto;

import java.util.List;

public class PdfParseResultDto {

    private int transactionsFound;
    private List<ParsedTransactionDto> transactions;
    private List<String> warnings;

    public PdfParseResultDto() {}

    public PdfParseResultDto(List<ParsedTransactionDto> transactions, List<String> warnings) {
        this.transactions = transactions;
        this.transactionsFound = transactions.size();
        this.warnings = warnings;
    }

    // Getters and Setters
    public int getTransactionsFound() { return transactionsFound; }
    public void setTransactionsFound(int n) { this.transactionsFound = n; }

    public List<ParsedTransactionDto> getTransactions() { return transactions; }
    public void setTransactions(List<ParsedTransactionDto> transactions) { this.transactions = transactions; }

    public List<String> getWarnings() { return warnings; }
    public void setWarnings(List<String> warnings) { this.warnings = warnings; }

    public static class ParsedTransactionDto {
        private String ticker;
        private String name;
        private String quantity;
        private String price;
        private String date;
        private String type;
        private String rawLine;

        public String getTicker() { return ticker; }
        public void setTicker(String ticker) { this.ticker = ticker; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getQuantity() { return quantity; }
        public void setQuantity(String quantity) { this.quantity = quantity; }

        public String getPrice() { return price; }
        public void setPrice(String price) { this.price = price; }

        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }

        public String getRawLine() { return rawLine; }
        public void setRawLine(String rawLine) { this.rawLine = rawLine; }
    }
}
