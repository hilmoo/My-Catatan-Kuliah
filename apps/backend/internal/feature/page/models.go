package page

import (
	"backend/internal/gen/models"
	db "backend/internal/gen/sqlc"
	"backend/internal/utils/uuidx"
	"time"

	"github.com/google/uuid"
	"github.com/ory/herodot"
)

type pageData struct {
	Iid          uuid.UUID
	Title        string
	Icon         *string
	Type         db.PageType
	Properties   []byte
	CreatedBy    int32
	CreatedAt    time.Time
	UpdatedAt    time.Time
	UserIid      uuid.UUID
	ParentIid    *uuid.UUID
	WorkspaceIid uuid.UUID
}

func buildAssignmentModel(data pageData) (*models.PageDetail, *herodot.DefaultError) {
	id, err := uuidx.HttpToBase58(data.Iid, "page ID")
	if err != nil {
		return nil, err
	}

	workspaceId, err := uuidx.HttpToBase58(data.WorkspaceIid, "workspace ID")
	if err != nil {
		return nil, err
	}

	authorId, err := uuidx.HttpToBase58(data.UserIid, "author ID")
	if err != nil {
		return nil, err
	}

	var properties models.PageAllProperties
	if data.Properties != nil {
		errs := properties.UnmarshalJSON(data.Properties)
		if errs != nil {
			return nil, herodot.ErrInternalServerError.WithReasonf("failed to unmarshal properties: %v", errs)
		}
	}

	parentIid, errs := uuidx.PToBase58(data.ParentIid)
	if errs != nil {
		return nil, herodot.ErrInternalServerError.WithReasonf("failed to encode parent ID: %v", errs)
	}

	return &models.PageDetail{
		CreatedAt:   &data.CreatedAt,
		CreatedBy:   &authorId,
		Icon:        data.Icon,
		Id:          &id,
		Properties:  &properties,
		ParentId:    parentIid,
		Title:       &data.Title,
		UpdatedAt:   &data.UpdatedAt,
		WorkspaceId: &workspaceId,
	}, nil
}

func mapDbListToModel(a db.ListPagesByWorkspaceIdAndTypeRow) (*models.PageDetail, *herodot.DefaultError) {
	return buildAssignmentModel(pageData{
		Iid:          a.Iid,
		Title:        a.Title,
		Icon:         a.Icon,
		Type:         a.Type,
		Properties:   a.Properties,
		CreatedBy:    a.CreatedBy,
		CreatedAt:    a.CreatedAt,
		UpdatedAt:    a.UpdatedAt,
		UserIid:      a.UserIid,
		ParentIid:    a.ParentIid,
		WorkspaceIid: a.WorkspaceIid,
	})
}

func mapDbDetailsToModel(a db.GetPageByIidRow) (*models.PageDetailResponse, *herodot.DefaultError) {
	return buildAssignmentModel(pageData{
		Iid:          a.Iid,
		Title:        a.Title,
		Icon:         a.Icon,
		Type:         a.Type,
		Properties:   a.Properties,
		CreatedBy:    a.CreatedBy,
		CreatedAt:    a.CreatedAt,
		UpdatedAt:    a.UpdatedAt,
		UserIid:      a.UserIid,
		ParentIid:    a.ParentIid,
		WorkspaceIid: a.WorkspaceIid,
	})
}

func mapDbCreateToModel(a db.CreatePageRow) (*models.PageDetailResponse, *herodot.DefaultError) {
	return buildAssignmentModel(pageData{
		Iid:          a.Iid,
		Title:        a.Title,
		Icon:         a.Icon,
		Type:         a.Type,
		Properties:   a.Properties,
		CreatedBy:    a.CreatedBy,
		CreatedAt:    a.CreatedAt,
		UpdatedAt:    a.UpdatedAt,
		UserIid:      a.UserIid,
		ParentIid:    a.ParentIid,
		WorkspaceIid: a.WorkspaceIid,
	})
}

func mapDbUpdateToModel(a db.UpdatePageRow) (*models.PageDetailResponse, *herodot.DefaultError) {
	return buildAssignmentModel(pageData{
		Iid:          a.Iid,
		Title:        a.Title,
		Icon:         a.Icon,
		Type:         a.Type,
		Properties:   a.Properties,
		CreatedBy:    a.CreatedBy,
		CreatedAt:    a.CreatedAt,
		UpdatedAt:    a.UpdatedAt,
		UserIid:      a.UserIid,
		ParentIid:    a.ParentIid,
		WorkspaceIid: a.WorkspaceIid,
	})
}
