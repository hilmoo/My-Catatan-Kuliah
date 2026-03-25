package config

import (
	"fmt"

	"github.com/caarlos0/env/v11"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type Config struct {
	// Base
	ListenPort int    `env:"LISTEN_PORT" envDefault:"8080"`
	ListenAddr string `env:"LISTEN_ADDR" envDefault:"0.0.0.0"`
	LogLevel   string `env:"LOG_LEVEL" envDefault:"INFO"`
	Domain     string `env:"DOMAIN,required"`
	Secret     string `env:"SECRET,required"`

	// Google OAuth
	GoogleClientID     string `env:"GOOGLE_CLIENT_ID,required"`
	GoogleClientSecret string `env:"GOOGLE_CLIENT_SECRET,required"`
	GoogleOauthConfig  *oauth2.Config

	DatabaseUrl string `env:"DATABASE_URL,required"`
}

func LoadConfig() (Config, error) {
	var c Config
	if err := env.Parse(&c); err != nil {
		return c, fmt.Errorf("env config: %w", err)
	}

	c.GoogleOauthConfig = loadAuthProvider(c)

	return c, nil
}

func loadAuthProvider(config Config) *oauth2.Config {
	oauth2Config := &oauth2.Config{
		ClientID:     config.GoogleClientID,
		ClientSecret: config.GoogleClientSecret,
		Endpoint:     google.Endpoint,
		RedirectURL:  config.Domain + "/auth/oauth/callback/google",
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.profile",
			"https://www.googleapis.com/auth/userinfo.email",
		},
	}

	return oauth2Config
}
