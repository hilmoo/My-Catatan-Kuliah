package cmd

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"

	"backend/internal/store/config"

	"github.com/pressly/goose/v3"
	"github.com/urfave/cli/v3"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func migrateCommand(cfg config.Config) *cli.Command {
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

func runMigration(cfg config.Config, command string, args cli.Args) error {
	db, err := sql.Open("pgx", cfg.DatabaseUrl)
	if err != nil {
		return fmt.Errorf("failed to open DB: %w", err)
	}

	defer func() {
		closeErr := db.Close()
		if err == nil {
			err = closeErr
		}
	}()

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
		if args.Len() < 2 {
			return fmt.Errorf("missing version argument for 'migrate up-to'")
		}
		versionStr := args.Get(1)
		version, parseErr := strconv.ParseInt(versionStr, 10, 64)
		if parseErr != nil {
			return fmt.Errorf("invalid version %q for 'migrate up-to': %v", versionStr, parseErr)
		}
		return goose.UpTo(db, dir, version)
	case "down":
		return goose.Down(db, dir)
	case "down-to":
		if args.Len() < 2 {
			return fmt.Errorf("missing version argument for 'migrate down-to'")
		}
		versionStr := args.Get(1)
		version, parseErr := strconv.ParseInt(versionStr, 10, 64)
		if parseErr != nil {
			return fmt.Errorf("invalid version %q for 'migrate down-to': %v", versionStr, parseErr)
		}
		return goose.DownTo(db, dir, version)
	case "status":
		return goose.Status(db, dir)
	default:
		return fmt.Errorf("unknown migration command: %s", command)
	}
}
