package app

import (
	"log/slog"
	"os"
)

func initLogger(levelStr string) *slog.Logger {
	baseHandler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: parseLevel(levelStr),
	})

	return slog.New(baseHandler)
}

func parseLevel(s string) slog.Level {
	var level slog.Level
	if err := level.UnmarshalText([]byte(s)); err != nil {
		return slog.LevelInfo
	}
	return level
}