package utils

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"streamflix/config"
)

func HumanSize(size int64) string {
	const unit = 1024
	if size < unit {
		return fmt.Sprintf("%d B", size)
	}
	div, exp := int64(unit), 0
	for n := size / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(size)/float64(div), "KMGTPE"[exp])
}

func SanitizeTitle(filename string) string {
	ext := filepath.Ext(filename)
	name := strings.TrimSuffix(filename, ext)
	name = strings.ReplaceAll(name, "_", " ")
	name = strings.ReplaceAll(name, ".", " ")
	name = strings.ReplaceAll(name, "-", " ")
	return strings.Title(strings.ToLower(name))
}

func ParseSeriesInfo(fileName string) (seriesTitle string, season int, episode int, groupType string) {
	name := strings.TrimSuffix(fileName, filepath.Ext(fileName))

	patterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)^(.*?)[ ._-]*s(\d{1,2})[ ._-]*e(\d{1,3})`),
		regexp.MustCompile(`(?i)^(.*?)[ ._-]*season[ ._-]*(\d{1,2})[ ._-]*episode[ ._-]*(\d{1,3})`),
	}

	for _, re := range patterns {
		m := re.FindStringSubmatch(name)
		if len(m) == 4 {
			rawTitle := strings.TrimSpace(m[1])
			if rawTitle == "" {
				rawTitle = name
			}
			seriesTitle = SanitizeTitle(rawTitle)
			season, _ = strconv.Atoi(m[2])
			episode, _ = strconv.Atoi(m[3])
			groupType = "series"
			return
		}
	}

	return "Movies/Other", 0, 0, "other"
}

func SanitizeStorageName(input string) string {
	value := strings.TrimSpace(input)
	if value == "" {
		return fmt.Sprintf("video_%d", time.Now().Unix())
	}

	value = strings.ToLower(value)
	value = strings.TrimSuffix(value, filepath.Ext(value))

	var b strings.Builder
	lastUnderscore := false
	for _, r := range value {
		isLetter := r >= 'a' && r <= 'z'
		isDigit := r >= '0' && r <= '9'
		if isLetter || isDigit {
			b.WriteRune(r)
			lastUnderscore = false
			continue
		}
		if !lastUnderscore {
			b.WriteRune('_')
			lastUnderscore = true
		}
	}

	name := strings.Trim(b.String(), "_")
	if name == "" {
		return fmt.Sprintf("video_%d", time.Now().Unix())
	}
	return name
}

func IsVideoFile(ext string) bool {
	videoExts := []string{".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v", ".ts", ".m2ts"}
	ext = strings.ToLower(ext)
	for _, v := range videoExts {
		if ext == v {
			return true
		}
	}
	return false
}

func IsAllowedThumbnailExt(ext string) bool {
	switch strings.ToLower(ext) {
	case ".jpg", ".jpeg", ".png":
		return true
	default:
		return false
	}
}

func GenerateThumbnailForVideo(filename string) error {
	if !IsVideoFile(strings.ToLower(filepath.Ext(filename))) {
		return fmt.Errorf("not a video file")
	}

	ffmpegPath, err := exec.LookPath("ffmpeg")
	if err != nil {
		return fmt.Errorf("ffmpeg not installed")
	}

	base := strings.TrimSuffix(filename, filepath.Ext(filename))
	thumbPath := filepath.Join(config.VideoDir, "thumbnails", base+"_auto_v2.jpg")
	if _, err := os.Stat(thumbPath); err == nil {
		return nil
	}

	inputPath := filepath.Join(config.VideoDir, filename)
	if _, err := os.Stat(inputPath); err != nil {
		return fmt.Errorf("video not found")
	}

	// Pick a more interesting frame from around 35% of the video duration.
	seekPos := "3"
	if ffprobePath, probeErr := exec.LookPath("ffprobe"); probeErr == nil {
		probeCtx, cancelProbe := context.WithTimeout(context.Background(), 8*time.Second)
		defer cancelProbe()

		probeCmd := exec.CommandContext(probeCtx, ffprobePath,
			"-v", "error",
			"-show_entries", "format=duration",
			"-of", "default=noprint_wrappers=1:nokey=1",
			inputPath,
		)
		if probeOut, probeRunErr := probeCmd.CombinedOutput(); probeRunErr == nil {
			if durationSec, parseErr := strconv.ParseFloat(strings.TrimSpace(string(probeOut)), 64); parseErr == nil && durationSec > 0 {
				target := durationSec * 0.35
				if target < 3 {
					target = 3
				}
				if durationSec > 6 && target > durationSec-2 {
					target = durationSec / 2
				}
				seekPos = fmt.Sprintf("%.2f", target)
			}
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, ffmpegPath,
		"-y",
		"-ss", seekPos,
		"-i", inputPath,
		"-frames:v", "1",
		"-q:v", "2",
		thumbPath,
	)
	output, err := cmd.CombinedOutput()
	if err != nil {
		_ = os.Remove(thumbPath)
		return fmt.Errorf("ffmpeg thumbnail failed: %s", strings.TrimSpace(string(output)))
	}

	return nil
}

func GetLocalIP() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "localhost"
	}
	for _, addr := range addrs {
		if ipNet, ok := addr.(*net.IPNet); ok && !ipNet.IP.IsLoopback() {
			if ipNet.IP.To4() != nil {
				return ipNet.IP.String()
			}
		}
	}
	return "localhost"
}

func DecodeEscapedPath(pathValue string) string {
	decoded, err := url.PathUnescape(pathValue)
	if err != nil {
		return pathValue
	}
	return decoded
}

func ExtractVideoFilenameFromPath(r *http.Request) string {
	raw := strings.TrimPrefix(r.URL.Path, "/api/videos/")
	raw = strings.Trim(raw, "/")
	return filepath.Base(DecodeEscapedPath(raw))
}

func ExtractThumbnailTargetFilenameFromPath(r *http.Request) string {
	raw := strings.TrimPrefix(r.URL.Path, "/api/videos/")
	raw = strings.TrimSuffix(raw, "/thumbnail")
	raw = strings.Trim(raw, "/")
	return filepath.Base(DecodeEscapedPath(raw))
}

func ExtractStreamFilenameFromPath(r *http.Request) string {
	raw := strings.TrimPrefix(r.URL.Path, "/api/stream/")
	raw = strings.Trim(raw, "/")
	return filepath.Base(DecodeEscapedPath(raw))
}

func ExtractThumbFilenameFromPath(r *http.Request) string {
	raw := strings.TrimPrefix(r.URL.Path, "/api/thumbnail/")
	raw = strings.Trim(raw, "/")
	return filepath.Base(DecodeEscapedPath(raw))
}
