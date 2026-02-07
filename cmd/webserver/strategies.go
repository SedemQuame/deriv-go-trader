package main

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

const StrategiesDir = "strategies"
const MetaFile = "meta.json"

type StrategyFile struct {
	Name string   `json:"name"`
	Path string   `json:"path"`
	Tags []string `json:"tags"`
}

type StrategyMeta struct {
	Tags []string `json:"tags"`
}

type MetaStore map[string]StrategyMeta

func loadMeta() MetaStore {
	store := make(MetaStore)
	data, err := os.ReadFile(filepath.Join(StrategiesDir, MetaFile))
	if err == nil {
		json.Unmarshal(data, &store)
	}
	return store
}

func saveMeta(store MetaStore) error {
	data, err := json.MarshalIndent(store, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(StrategiesDir, MetaFile), data, 0644)
}

func ensureStrategiesDir() {
	if _, err := os.Stat(StrategiesDir); os.IsNotExist(err) {
		os.Mkdir(StrategiesDir, 0755)
	}
}

func handleStrategiesList(w http.ResponseWriter, r *http.Request) {
	ensureStrategiesDir()

	files, err := os.ReadDir(StrategiesDir)
	if err != nil {
		http.Error(w, "Failed to read strategies directory", http.StatusInternalServerError)
		return
	}

	meta := loadMeta()
	var strategies []StrategyFile

	for _, file := range files {
		if !file.IsDir() && (strings.HasSuffix(file.Name(), ".js") || strings.HasSuffix(file.Name(), ".xml")) {
			name := file.Name()
			tags := []string{}
			if m, ok := meta[name]; ok {
				tags = m.Tags
			}

			strategies = append(strategies, StrategyFile{
				Name: name,
				Path: filepath.Join(StrategiesDir, name),
				Tags: tags,
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(strategies)
}

func handleStrategyGet(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "Strategy name required", http.StatusBadRequest)
		return
	}

	if strings.Contains(name, "..") || strings.Contains(name, "/") || strings.Contains(name, "\\") {
		http.Error(w, "Invalid strategy name", http.StatusBadRequest)
		return
	}

	content, err := os.ReadFile(filepath.Join(StrategiesDir, name))
	if err != nil {
		if os.IsNotExist(err) {
			http.Error(w, "Strategy not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to read strategy", http.StatusInternalServerError)
		return
	}

	// Determine content type based on extension
	if strings.HasSuffix(name, ".xml") {
		w.Header().Set("Content-Type", "application/xml")
	} else {
		w.Header().Set("Content-Type", "text/plain")
	}
	w.Write(content)
}

func handleStrategySave(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	ensureStrategiesDir()

	var req struct {
		Name    string   `json:"name"`
		Content string   `json:"content"`
		Tags    []string `json:"tags"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		http.Error(w, "Strategy name required", http.StatusBadRequest)
		return
	}

	// Auto-append .js if no extension provided, assuming JS default.
	// However, if the user provides a name with no extension but wants XML, the caller should handle it.
	// We will enforce that if it doesn't end in .xml or .js, we append .js
	if !strings.HasSuffix(req.Name, ".js") && !strings.HasSuffix(req.Name, ".xml") {
		req.Name += ".js"
	}

	if strings.Contains(req.Name, "..") || strings.Contains(req.Name, "/") || strings.Contains(req.Name, "\\") {
		http.Error(w, "Invalid strategy name", http.StatusBadRequest)
		return
	}

	// Save Content
	path := filepath.Join(StrategiesDir, req.Name)
	if err := os.WriteFile(path, []byte(req.Content), 0644); err != nil {
		http.Error(w, "Failed to save strategy", http.StatusInternalServerError)
		return
	}

	// Save Metadata
	meta := loadMeta()
	meta[req.Name] = StrategyMeta{Tags: req.Tags}
	saveMeta(meta)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "saved", "name": req.Name})
}

func handleStrategyDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete && r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	name := r.URL.Query().Get("name")
	if name == "" {
		http.Error(w, "Strategy name required", http.StatusBadRequest)
		return
	}

	if strings.Contains(name, "..") || strings.Contains(name, "/") || strings.Contains(name, "\\") {
		http.Error(w, "Invalid strategy name", http.StatusBadRequest)
		return
	}

	path := filepath.Join(StrategiesDir, name)
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		http.Error(w, "Failed to delete file", http.StatusInternalServerError)
		return
	}

	// Remove from metadata
	meta := loadMeta()
	delete(meta, name)
	saveMeta(meta)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted", "name": name})
}
