package app

import (
	"fmt"

	"github.com/caarlos0/env/v11"
)

type Config struct {
	// Base
	ListenPort int    `env:"LISTEN_PORT" envDefault:"8080"`
	ListenAddr string `env:"LISTEN_ADDR" envDefault:"0.0.0.0"`
	LogLevel   string `env:"LOG_LEVEL" envDefault:"INFO"`

	DatabaseUrl string `env:"DATABASE_URL,required"`
}

func LoadConfig() (Config, error) {
	var c Config
	if err := env.Parse(&c); err != nil {
		return c, fmt.Errorf("env config: %w", err)
	}

	return c, nil
}