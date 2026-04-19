package files

import (
	"backend/internal/gen/models"
	db "backend/internal/gen/sqlc"
	errort "backend/internal/transport/error"
	helpert "backend/internal/transport/helper"
	"backend/internal/transport/validation"

	"github.com/labstack/echo/v5"
	"github.com/rhnvrm/simples3"
)

type httpHandler struct {
	validate *validation.Vld
	queries  *db.Queries
	s3       *simples3.S3
	bucket   string
}

func NewHttpHandler(args helpert.HttpHandlerParams, s3 *simples3.S3) *httpHandler {
	return &httpHandler{
		validate: args.Validate,
		queries:  args.Queries,
		s3:       s3,
		bucket:   args.Config.S3Bucket,
	}
}

func (h *httpHandler) RegisterRoutes(e *echo.Group) {
	group := e.Group("/files")

	group.GET("/:file_id", h.getFile)
	group.POST("", h.uploadFile)
	group.DELETE("/:file_id", h.deleteFile)
}

func (h *httpHandler) getFile(c *echo.Context) error {
	fileId := c.Param("file_id")

	resp, err := getFileService(c.Request().Context(), getFileServiceArgs{
		FileId:  fileId,
		Queries: h.queries,
		S3:      h.s3,
		Bucket:  h.bucket,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.JSON(200, resp)
}

func (h *httpHandler) uploadFile(c *echo.Context) error {
	params, err := validation.BindValidatePayload[models.GetFileUploadPresignedUrlJSONRequestBody](c, h.validate)
	if err != nil {
		return errort.HttpError(c, err)
	}

	resp, errH := uploadFileService(c.Request().Context(), uploadFileServiceArgs{
		Queries: h.queries,
		S3:      h.s3,
		Bucket:  h.bucket,
		Param:   params,
	})
	if errH != nil {
		return errort.HttpError(c, errH)
	}

	return c.JSON(200, resp)
}

func (h *httpHandler) deleteFile(c *echo.Context) error {
	fileId := c.Param("file_id")

	err := deleteFileService(c.Request().Context(), deleteFileServiceArgs{
		FileId:  fileId,
		Queries: h.queries,
		S3:      h.s3,
		Bucket:  h.bucket,
	})
	if err != nil {
		return errort.HttpError(c, err)
	}

	return c.NoContent(204)
}
