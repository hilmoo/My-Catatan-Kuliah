package app

import (
	"backend/internal/event"
	"backend/internal/store/config"
	"context"
)

func initEvent(ctx context.Context, cfg config.Config) error {
	js, err := event.InitNats(cfg.NatsUrl)
	if err != nil {
		return err
	}

	event.InitEmbedderStream(ctx, js)

	return nil
}
