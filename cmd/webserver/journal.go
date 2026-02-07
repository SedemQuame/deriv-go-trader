package main

import (
	"deriv_trade/database"
	"encoding/json"
	"net/http"
	"strconv"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

func handleJournalList(w http.ResponseWriter, r *http.Request) {
	if dbClient == nil {
		http.Error(w, "Database not connected", http.StatusServiceUnavailable)
		return
	}

	limitStr := r.URL.Query().Get("limit")
	limit := int64(20)
	if limitStr != "" {
		if val, err := strconv.ParseInt(limitStr, 10, 64); err == nil {
			limit = val
		}
	}

	entries, err := dbClient.GetJournalEntries(r.Context(), limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(entries)
}

func handleJournalCreate(w http.ResponseWriter, r *http.Request) {
	if dbClient == nil {
		http.Error(w, "Database not connected", http.StatusServiceUnavailable)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Title   string   `json:"title"`
		Content string   `json:"content"`
		Tags    []string `json:"tags"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.Title == "" || req.Content == "" {
		http.Error(w, "Title and Content are required", http.StatusBadRequest)
		return
	}

	entry := &database.JournalEntry{
		Title:   req.Title,
		Content: req.Content,
		Tags:    req.Tags,
	}

	if err := dbClient.CreateJournalEntry(r.Context(), entry); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(entry)
}

func handleJournalDelete(w http.ResponseWriter, r *http.Request) {
	if dbClient == nil {
		http.Error(w, "Database not connected", http.StatusServiceUnavailable)
		return
	}
	if r.Method != http.MethodDelete && r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.URL.Query().Get("id")
	if idStr == "" {
		http.Error(w, "ID required", http.StatusBadRequest)
		return
	}

	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	if err := dbClient.DeleteJournalEntry(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

func handleLogsDownload(w http.ResponseWriter, r *http.Request) {
	// Return the webserver.log file content
	w.Header().Set("Content-Disposition", "attachment; filename=system_logs.txt")
	w.Header().Set("Content-Type", "text/plain")
	http.ServeFile(w, r, "webserver.log")
}
