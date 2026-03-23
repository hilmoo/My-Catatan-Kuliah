package app

import (
	"backend/internal/store/config"
	"backend/internal/transport/validation"
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/labstack/echo/v5"
)

func Main(cfg config.Config) error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	db, err := initDb(ctx, cfg)
	if err != nil {
		return err
	}
	defer db.Close()

	logger := initLogger(cfg.LogLevel)
	vld := validation.InitValidation()

	app := initHandler(initHandlerParams{
		logger: logger,
		vld:    vld,
		dbPool: db,
		cfg:    cfg,
	})
	sc := echo.StartConfig{
		Address:         fmt.Sprintf("%s:%d", cfg.ListenAddr, cfg.ListenPort),
		HideBanner:      true,
		GracefulTimeout: 10 * time.Second,
	}
	if err := sc.Start(ctx, app); err != nil {
		logger.Error("failed to start server", slog.String("error", err.Error()))
		return fmt.Errorf("start server: %w", err)
	}

	return nil
}
