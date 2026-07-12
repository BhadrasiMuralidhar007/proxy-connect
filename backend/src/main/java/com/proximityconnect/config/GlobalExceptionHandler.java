package com.proximityconnect.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Without this, exceptions Spring doesn't already know how to render
 * (bean validation failures, unexpected nulls, DB constraint errors, etc.)
 * fall through to the default Whitelabel error page - which isn't valid
 * JSON, so the frontend can't read a message out of it and shows a generic
 * "something went wrong" fallback. This makes sure the frontend always
 * gets back {"error": "..."} with something actionable in it.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    // Triggered when @Valid fails on a request DTO (e.g. missing/blank field,
    // bad email format, password too short). Collects every failing field
    // into one readable message instead of Spring's default nested format.
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + ": " + f.getDefaultMessage())
                .reduce((a, b) -> a + "; " + b)
                .orElse("Invalid request.");
        return ResponseEntity.badRequest().body(Map.of("error", message));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
    }

    // Last resort: anything truly unexpected (DB errors, NPEs, etc.) still
    // comes back as JSON with a 500, and the real exception is logged
    // server-side so it shows up in your console for debugging.
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleUnexpected(Exception ex) {
        ex.printStackTrace();
        Map<String, String> body = new LinkedHashMap<>();
        body.put("error", "Unexpected server error: " + ex.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
