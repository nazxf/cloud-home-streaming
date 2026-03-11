package db

import (
	"database/sql"
	"strings"

	"streamflix/config"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

func InitDB() error {
	var err error
	DB, err = sql.Open("sqlite", config.DBPath)
	if err != nil {
		return err
	}

	if _, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS video_meta (
			filename TEXT PRIMARY KEY,
			title TEXT NOT NULL,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`); err != nil {
		return err
	}

	return nil
}

func UpsertVideoTitle(filename, title string) error {
	if strings.TrimSpace(filename) == "" || strings.TrimSpace(title) == "" {
		return nil
	}
	_, err := DB.Exec(`
		INSERT INTO video_meta (filename, title, updated_at)
		VALUES (?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(filename)
		DO UPDATE SET title=excluded.title, updated_at=CURRENT_TIMESTAMP
	`, filename, title)
	return err
}

func DeleteVideoMeta(filename string) error {
	_, err := DB.Exec(`DELETE FROM video_meta WHERE filename = ?`, filename)
	return err
}

func LoadVideoTitles() map[string]string {
	result := map[string]string{}
	rows, err := DB.Query(`SELECT filename, title FROM video_meta`)
	if err != nil {
		return result
	}
	defer rows.Close()

	for rows.Next() {
		var filename, title string
		if err := rows.Scan(&filename, &title); err == nil {
			result[filename] = title
		}
	}
	return result
}
