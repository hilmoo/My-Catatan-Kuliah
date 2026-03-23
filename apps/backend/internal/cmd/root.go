package cmd

import (
	"backend/internal/store/config"
	"context"
	"log"
	"os"

	"github.com/urfave/cli/v3"
)

func RootCmd() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	cmd := &cli.Command{
		Name:  "go-backend-example",
		Usage: "A Go backend example application with migration support",
		Commands: []*cli.Command{
			serveCommand(cfg),
			migrateCommand(cfg),
		},
	}

	if err := cmd.Run(context.Background(), os.Args); err != nil {
		log.Fatal(err)
	}
}
