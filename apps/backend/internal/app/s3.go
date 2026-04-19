package app

import (
	"backend/internal/store/config"
	"github.com/rhnvrm/simples3"
)

func initS3(cfg config.Config) *simples3.S3 {
	s3 := simples3.New(cfg.S3Region, cfg.S3AccessKeyID, cfg.S3SecretAccessKey)
	s3.Endpoint = cfg.S3Endpoint

	return s3
}
