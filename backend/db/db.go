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

	// Add new columns (ignore errors if they already exist)
	_, _ = DB.Exec(`ALTER TABLE video_meta ADD COLUMN content_type TEXT DEFAULT 'movie'`)
	_, _ = DB.Exec(`ALTER TABLE video_meta ADD COLUMN series_title TEXT DEFAULT ''`)
	_, _ = DB.Exec(`ALTER TABLE video_meta ADD COLUMN season INTEGER DEFAULT 0`)
	_, _ = DB.Exec(`ALTER TABLE video_meta ADD COLUMN episode INTEGER DEFAULT 0`)

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

type VideoMeta struct {
	Filename    string
	Title       string
	ContentType string
	SeriesTitle string
	Season      int
	Episode     int
}

func UpsertVideoMeta(meta VideoMeta) error {
	if strings.TrimSpace(meta.Filename) == "" || strings.TrimSpace(meta.Title) == "" {
		return nil
	}
	if meta.ContentType == "" {
		meta.ContentType = "movie"
	}
	_, err := DB.Exec(`
		INSERT INTO video_meta (filename, title, content_type, series_title, season, episode, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(filename)
		DO UPDATE SET 
			title=excluded.title, 
			content_type=excluded.content_type,
			series_title=excluded.series_title,
			season=excluded.season,
			episode=excluded.episode,
			updated_at=CURRENT_TIMESTAMP
	`, meta.Filename, meta.Title, meta.ContentType, meta.SeriesTitle, meta.Season, meta.Episode)
	return err
}

func DeleteVideoMeta(filename string) error {
	_, err := DB.Exec(`DELETE FROM video_meta WHERE filename = ?`, filename)
	return err
}

func LoadVideoMeta() map[string]VideoMeta {
	result := map[string]VideoMeta{}
	rows, err := DB.Query(`SELECT filename, title, coalesce(content_type, 'movie'), coalesce(series_title, ''), coalesce(season, 0), coalesce(episode, 0) FROM video_meta`)
	if err != nil {
		return result
	}
	defer rows.Close()

	for rows.Next() {
		var meta VideoMeta
		if err := rows.Scan(&meta.Filename, &meta.Title, &meta.ContentType, &meta.SeriesTitle, &meta.Season, &meta.Episode); err == nil {
			result[meta.Filename] = meta
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
