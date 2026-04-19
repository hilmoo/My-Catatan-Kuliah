package files

import (
	"backend/internal/gen/models"
	db "backend/internal/gen/sqlc"
	msession "backend/internal/transport/middleware/session"
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/ory/herodot"
	"github.com/rhnvrm/simples3"
)

type getFileServiceArgs struct {
	FileId  string
	Queries *db.Queries
	S3      *simples3.S3
	Bucket  string
}

func getFileService(ctx context.Context, args getFileServiceArgs) (*models.FileGetResponse, *herodot.DefaultError) {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	file_uuid, err := uuid.Parse(args.FileId)
	if err != nil {
		return nil, herodot.ErrBadRequest.WithReasonf("invalid file ID: %v", err)
	}

	file, err := args.Queries.GetFileByID(ctx, db.GetFileByIDParams{
		ID:        file_uuid,
		CreatedBy: user.ID,
	})
	if err != nil {
		return nil, herodot.ErrInternalServerError.WithReasonf("failed to get file: %v", err)
	}

	url := args.S3.GeneratePresignedURL(simples3.PresignedInput{
		Bucket:        args.Bucket,
		ObjectKey:     file.S3Key,
		Method:        "GET",
		ExpirySeconds: 3600,
	})

	return &models.FileGetResponse{
		Url: url,
	}, nil
}

type uploadFileServiceArgs struct {
	Queries *db.Queries
	S3      *simples3.S3
	Bucket  string
	Param   *models.GetFileUploadPresignedUrlJSONRequestBody
}

func uploadFileService(ctx context.Context, args uploadFileServiceArgs) (*models.FileUploadResponse, *herodot.DefaultError) {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return nil, herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	s3Key := fmt.Sprintf("%s/%s", user.Iid, uuid.New().String())
	sizeBytes := int64(*args.Param.Size) * 1024 * 1024

	if err := args.Queries.CreateFile(ctx, db.CreateFileParams{
		S3Key:     s3Key,
		MimeType:  args.Param.MimeType,
		Size:      sizeBytes,
		CreatedBy: user.ID,
	}); err != nil {
		return nil, herodot.ErrInternalServerError.WithReasonf("failed to create file record: %v", err)
	}

	url := args.S3.GeneratePresignedURL(simples3.PresignedInput{
		Bucket:        args.Bucket,
		ObjectKey:     s3Key,
		Method:        "PUT",
		ExpirySeconds: 3600,
		ExtraHeaders: map[string]string{
			"Content-Type": args.Param.MimeType,
			// TODO: exact size?
			"Content-Length": fmt.Sprintf("%d", sizeBytes),
		},
	})

	return &models.FileUploadResponse{
		Url: url,
	}, nil
}

type deleteFileServiceArgs struct {
	FileId  string
	Queries *db.Queries
	S3      *simples3.S3
	Bucket  string
}

func deleteFileService(ctx context.Context, args deleteFileServiceArgs) *herodot.DefaultError {
	user, err := msession.GetUserFromContext(ctx)
	if err != nil {
		return herodot.ErrUnauthorized.WithReason("unauthenticated").WithDebug(err.Error())
	}

	file_uuid, err := uuid.Parse(args.FileId)
	if err != nil {
		return herodot.ErrBadRequest.WithReasonf("invalid file ID: %v", err)
	}

	s3Key, err := args.Queries.DeleteFileByID(ctx, db.DeleteFileByIDParams{
		ID:        file_uuid,
		CreatedBy: user.ID,
	})
	if err != nil {
		return herodot.ErrInternalServerError.WithReasonf("failed to delete file record: %v", err)
	}

	if err := args.S3.FileDelete(simples3.DeleteInput{
		Bucket:    args.Bucket,
		ObjectKey: s3Key,
	}); err != nil {
		return herodot.ErrInternalServerError.WithReasonf("failed to delete file from storage: %v", err)
	}

	return nil
}
