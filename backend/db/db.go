package db

import (
	"database/sql"
	"strings"
	"time"

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

	if _, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS user_progress (
			username TEXT NOT NULL,
			filename TEXT NOT NULL,
			position_seconds INTEGER NOT NULL DEFAULT 0,
			duration_seconds INTEGER NOT NULL DEFAULT 0,
			completed INTEGER NOT NULL DEFAULT 0,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY(username, filename)
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

func UpsertUserProgress(username, filename string, positionSeconds, durationSeconds int64, completed bool) error {
	if strings.TrimSpace(username) == "" || strings.TrimSpace(filename) == "" {
		return nil
	}
	completedValue := 0
	if completed {
		completedValue = 1
	}
	_, err := DB.Exec(`
		INSERT INTO user_progress (username, filename, position_seconds, duration_seconds, completed, updated_at)
		VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(username, filename)
		DO UPDATE SET
			position_seconds=excluded.position_seconds,
			duration_seconds=excluded.duration_seconds,
			completed=excluded.completed,
			updated_at=CURRENT_TIMESTAMP
	`, username, filename, positionSeconds, durationSeconds, completedValue)
	return err
}

func GetUserProgress(username, filename string) (int64, int64, bool, time.Time, error) {
	var position, duration int64
	var completedInt int
	var updated time.Time
	err := DB.QueryRow(`
		SELECT position_seconds, duration_seconds, completed, updated_at
		FROM user_progress
		WHERE username = ? AND filename = ?
	`, username, filename).Scan(&position, &duration, &completedInt, &updated)
	return position, duration, completedInt == 1, updated, err
}

func DeleteProgressForFilename(filename string) error {
	_, err := DB.Exec(`DELETE FROM user_progress WHERE filename = ?`, filename)
	return err
}

func RenameProgressFilename(oldFilename, newFilename string) error {
	if strings.TrimSpace(oldFilename) == "" || strings.TrimSpace(newFilename) == "" || oldFilename == newFilename {
		return nil
	}
	_, err := DB.Exec(`UPDATE user_progress SET filename = ? WHERE filename = ?`, newFilename, oldFilename)
	return err
}
