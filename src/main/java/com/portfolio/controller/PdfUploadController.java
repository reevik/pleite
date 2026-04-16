package com.portfolio.controller;

import com.portfolio.dto.PdfParseResultDto;
import com.portfolio.service.PdfParserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/pdf")
public class PdfUploadController {

    private final PdfParserService pdfParserService;

    public PdfUploadController(PdfParserService pdfParserService) {
        this.pdfParserService = pdfParserService;
    }

    @PostMapping("/parse")
    public ResponseEntity<PdfParseResultDto> parsePdf(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        if (!file.getContentType().equals("application/pdf")) {
            return ResponseEntity.badRequest().build();
        }

        try {
            PdfParseResultDto result = pdfParserService.parsePdf(file);
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
