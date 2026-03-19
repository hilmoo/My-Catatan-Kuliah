package cmd

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"

	"backend/internal/app"
	"github.com/pressly/goose/v3"
	"github.com/urfave/cli/v3"
)

func migrateCommand(cfg app.Config) *cli.Command {
	return &cli.Command{
		Name:  "migrate",
		Usage: "Database migration commands",
		Commands: []*cli.Command{
			{
				Name:  "up",
				Usage: "Migrate the DB to the most recent version available",
				Action: func(ctx context.Context, cmd *cli.Command) error {
					return runMigration(cfg, "up", cmd.Args())
				},
			},
			{
				Name:  "up-to",
				Usage: "Migrate the DB to a specific version",
				Action: func(ctx context.Context, cmd *cli.Command) error {
					return runMigration(cfg, "up-to", cmd.Args())
				},
			},
			{
				Name:  "down-to",
				Usage: "Roll back to a specific version",
				Action: func(ctx context.Context, cmd *cli.Command) error {
					return runMigration(cfg, "down-to", cmd.Args())
				},
			},
			{
				Name:  "down",
				Usage: "Roll back the version by 1",
				Action: func(ctx context.Context, cmd *cli.Command) error {
					return runMigration(cfg, "down", cmd.Args())
				},
			},
			{
				Name:  "status",
				Usage: "Dump the migration status for the current DB",
				Action: func(ctx context.Context, cmd *cli.Command) error {
					return runMigration(cfg, "status", cmd.Args())
				},
			},
		},
	}
}

func runMigration(cfg app.Config, command string, args cli.Args) error {
	db, err := sql.Open("pgx", cfg.DatabaseUrl)
	if err != nil {
		return fmt.Errorf("failed to open DB: %w", err)
	}
	defer db.Close()

	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("failed to set goose dialect: %w", err)
	}

	dir := args.First()
	if dir == "" {
		dir = "./migrations"
	}

	switch command {
	case "up":
		return goose.Up(db, dir)
	case "up-to":
		version, _ := strconv.ParseInt(args.Get(1), 10, 64)
		return goose.UpTo(db, dir, version)
	case "down":
		return goose.Down(db, dir)
	case "down-to":
		version, _ := strconv.ParseInt(args.Get(1), 10, 64)
		return goose.DownTo(db, dir, version)
	case "status":
		return goose.Status(db, dir)
	default:
		return fmt.Errorf("unknown migration command: %s", command)
	}
}
