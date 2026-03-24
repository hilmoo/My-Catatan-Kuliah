package assignments

import (
	"backend/internal/gen/models"
	db "backend/internal/gen/sqlc"
	"backend/utils/uuidx"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/ory/herodot"
)

type AssignmentData struct {
	Iid          uuid.UUID
	WorkspaceIid uuid.UUID
	UserIid      uuid.UUID
	ParentIid    *uuid.UUID
	Properties   []byte
	Icon         *string
	Title        string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// 2. The core logic now relies on strict types, keeping the compiler happy.
func buildAssignmentModel(data AssignmentData) (*models.Assignment, *herodot.DefaultError) {
	id, err := uuidx.HttpToBase58(data.Iid, "assignment ID")
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

	var properties models.AssignmentProperties
	if err := json.Unmarshal(data.Properties, &properties); err != nil {
		properties = models.AssignmentProperties{}
	}

	return &models.Assignment{
		CreatedAt:   &data.CreatedAt,
		CreatedBy:   &authorId,
		Icon:        data.Icon,
		Id:          &id,
		ParentId:    uuidx.PToBase58(data.ParentIid),
		Properties:  &properties,
		Title:       &data.Title,
		UpdatedAt:   &data.UpdatedAt,
		WorkspaceId: &workspaceId,
	}, nil
}

func mapAssignmentListToModel(a db.ListAssignmentPagesByWorkspaceIdRow) (*models.Assignment, *herodot.DefaultError) {
	return buildAssignmentModel(AssignmentData{
		Iid:          a.Iid,
		WorkspaceIid: a.WorkspaceIid,
		UserIid:      a.UserIid,
		ParentIid:    a.ParentIid,
		Properties:   a.Properties,
		Icon:         a.Icon,
		Title:        a.Title,
		CreatedAt:    a.CreatedAt,
		UpdatedAt:    a.UpdatedAt,
	})
}

func mapAssignmentGetToModel(a db.GetAssignmentPageByIidRow) (*models.Assignment, *herodot.DefaultError) {
	return buildAssignmentModel(AssignmentData{
		Iid:          a.Iid,
		WorkspaceIid: a.WorkspaceIid,
		UserIid:      a.UserIid,
		ParentIid:    a.ParentIid,
		Properties:   a.Properties,
		Icon:         a.Icon,
		Title:        a.Title,
		CreatedAt:    a.CreatedAt,
		UpdatedAt:    a.UpdatedAt,
	})
}

func mapAssignmentCreateToModel(a db.CreateAssignmentPageRow) (*models.Assignment, *herodot.DefaultError) {
	return buildAssignmentModel(AssignmentData{
		Iid:          a.Iid,
		WorkspaceIid: a.WorkspaceIid,
		UserIid:      a.UserIid,
		ParentIid:    a.ParentIid,
		Properties:   a.Properties,
		Icon:         a.Icon,
		Title:        a.Title,
		CreatedAt:    a.CreatedAt,
		UpdatedAt:    a.UpdatedAt,
	})
}

func mapAssignmentUpdateToModel(a db.UpdateAssignmentPageRow) (*models.Assignment, *herodot.DefaultError) {
	return buildAssignmentModel(AssignmentData{
		Iid:          a.Iid,
		WorkspaceIid: a.WorkspaceIid,
		UserIid:      a.UserIid,
		ParentIid:    a.ParentIid,
		Properties:   a.Properties,
		Icon:         a.Icon,
		Title:        a.Title,
		CreatedAt:    a.CreatedAt,
		UpdatedAt:    a.UpdatedAt,
	})
}
