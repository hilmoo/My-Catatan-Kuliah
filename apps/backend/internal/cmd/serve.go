package cmd

import (
	"context"
	"log"

	"backend/internal/app"
	"backend/internal/store/config"

	"github.com/urfave/cli/v3"
)

func serveCommand(cfg config.Config) *cli.Command {
	return &cli.Command{
		Name:  "serve",
		Usage: "Run the application server",
		Action: func(ctx context.Context, cmd *cli.Command) error {
			log.Println("Starting application server...")
			if err := app.Main(cfg); err != nil {
				return err
			}
			return nil
		},
	}
}
