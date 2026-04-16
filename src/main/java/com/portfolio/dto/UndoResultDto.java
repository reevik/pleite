package com.portfolio.dto;

import java.util.List;

public class UndoResultDto {

    private int undoneCount;
    private List<TransactionDto> undoneTransactions;

    public UndoResultDto() {}

    public UndoResultDto(int undoneCount, List<TransactionDto> undoneTransactions) {
        this.undoneCount = undoneCount;
        this.undoneTransactions = undoneTransactions;
    }

    public int getUndoneCount() { return undoneCount; }
    public void setUndoneCount(int undoneCount) { this.undoneCount = undoneCount; }

    public List<TransactionDto> getUndoneTransactions() { return undoneTransactions; }
    public void setUndoneTransactions(List<TransactionDto> undoneTransactions) {
        this.undoneTransactions = undoneTransactions;
    }
}
