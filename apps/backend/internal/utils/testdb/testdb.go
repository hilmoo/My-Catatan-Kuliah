//go:build integration

package testdb

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"testing"

	db "backend/internal/gen/sqlc"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/pressly/goose/v3"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

type TestDB struct {
	Pool    *pgxpool.Pool
	Queries *db.Queries
}

func Setup(ctx context.Context) (*TestDB, func(), error) {
	pgContainer, err := postgres.Run(
		ctx,
		"pgvector/pgvector:pg18-trixie",
		postgres.WithDatabase("testdb"),
		postgres.WithUsername("testuser"),
		postgres.WithPassword("testpass"),
		postgres.BasicWaitStrategies(),
	)
	if err != nil {
		return nil, nil, fmt.Errorf("start postgres container: %w", err)
	}

	containerCleanup := func() {
		_ = testcontainers.TerminateContainer(pgContainer)
	}

	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		containerCleanup()
		return nil, nil, fmt.Errorf("get connection string: %w", err)
	}

	// Open a database/sql connection for goose migrations.
	sqlDB, err := sql.Open("pgx", connStr)
	if err != nil {
		containerCleanup()
		return nil, nil, fmt.Errorf("open sql db: %w", err)
	}
	defer func() { _ = sqlDB.Close() }()

	sub, err := fs.Sub(migrationsFS, "migrations")
	if err != nil {
		containerCleanup()
		return nil, nil, fmt.Errorf("sub migrations fs: %w", err)
	}

	provider, err := goose.NewProvider(goose.DialectPostgres, sqlDB, sub)
	if err != nil {
		containerCleanup()
		return nil, nil, fmt.Errorf("create goose provider: %w", err)
	}

	if _, err := provider.Up(ctx); err != nil {
		containerCleanup()
		return nil, nil, fmt.Errorf("run migrations: %w", err)
	}

	pool, err := pgxpool.New(ctx, connStr)
	if err != nil {
		containerCleanup()
		return nil, nil, fmt.Errorf("create pgxpool: %w", err)
	}

	cleanup := func() {
		pool.Close()
		containerCleanup()
	}

	return &TestDB{Pool: pool, Queries: db.New(pool)}, cleanup, nil
}

// New is a per-test helper: starts the container and registers cleanup with t.
func New(t *testing.T) *TestDB {
	t.Helper()
	tdb, cleanup, err := Setup(context.Background())
	require.NoError(t, err)
	t.Cleanup(cleanup)
	return tdb
}

// CreateUser upserts a test user identified by email.
func (tdb *TestDB) CreateUser(ctx context.Context, email, name string) (db.User, error) {
	return tdb.Queries.UpdateOrCreateUser(ctx, db.UpdateOrCreateUserParams{
		Email:      email,
		Name:       name,
		Provider:   db.ProviderGoogle,
		ProviderID: fmt.Sprintf("test_%s", email),
	})
}
