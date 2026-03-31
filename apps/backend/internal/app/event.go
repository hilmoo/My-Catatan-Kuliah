package app

import (
	"backend/internal/event"
	"backend/internal/store/config"
	"context"

	"github.com/nats-io/nats.go"
)

func initEvent(ctx context.Context, cfg config.Config) (*nats.Conn, error) {
	nc, js, err := event.InitNats(cfg.NatsUrl)
	if err != nil {
		return nil, err
	}

	err = event.InitEmbedderStream(ctx, js)
	if err != nil {
		nc.Close()
		return nil, err
	}

	return nc, nil
}
