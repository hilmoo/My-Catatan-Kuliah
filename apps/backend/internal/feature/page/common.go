package page

import (
	"backend/internal/gen/models"
	db "backend/internal/gen/sqlc"
	"backend/internal/transport/validation"
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/ory/herodot"
)

type getParentIdParams struct {
	queries   *db.Queries
	pageType  models.PageCreateType
	parentIid *uuid.UUID
	userId    int32
}

func getPageParentId(ctx context.Context, args getParentIdParams) (*int32, error) {
	if args.parentIid == nil {
		if args.pageType == models.PageCreateTypeAssignment {
			return nil, herodot.ErrBadRequest.WithReasonf("assignment page requires a parent")
		}
		return nil, nil
	}

	switch args.pageType {
	case models.PageCreateTypeFolder:
		parentId, err := args.queries.GetValidParentForFolder(ctx, db.GetValidParentForFolderParams{
			Iid:       *args.parentIid,
			CreatedBy: args.userId,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to get folder parent: %w", err)
		}
		return &parentId, nil

	case models.PageCreateTypeCourse:
		parentId, err := args.queries.GetValidParentIdForCourse(ctx, db.GetValidParentIdForCourseParams{
			Iid:       *args.parentIid,
			CreatedBy: args.userId,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to get course parent: %w", err)
		}
		return &parentId, nil

	case models.PageCreateTypeNote:
		parentId, err := args.queries.GetValidParentIdForNote(ctx, db.GetValidParentIdForNoteParams{
			Iid:       *args.parentIid,
			CreatedBy: args.userId,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to get note parent: %w", err)
		}
		return &parentId, nil

	case models.PageCreateTypeAssignment:
		parentId, err := args.queries.GetValidParentIdForAssignment(ctx, db.GetValidParentIdForAssignmentParams{
			Iid:       *args.parentIid,
			CreatedBy: args.userId,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to get assignment parent: %w", err)
		}
		return &parentId, nil

	default:
		return nil, fmt.Errorf("unsupported page type: %s", args.pageType)
	}
}

type httpMarshalValidatePropertiesParams struct {
	vld        *validation.Vld
	properties *models.PageAllProperties
	pageType   db.PageType
}

func httpMarshalValidateProperties(args httpMarshalValidatePropertiesParams) ([]byte, *herodot.DefaultError) {
	if args.properties == nil {
		return nil, nil
	}

	pagetype := db.PageType(args.pageType)
	switch pagetype {
	case db.PageTypeFolder:
		p, err := args.properties.AsPagePropertiesFolder()
		if err != nil {
			return nil, herodot.ErrBadRequest.WithReasonf("invalid folder properties: %v", err)
		}
		if errH := validation.ValidatePayload(args.vld, &p); errH != nil {
			return nil, errH
		}
	case db.PageTypeCourse:
		p, err := args.properties.AsPagePropertiesCourse()
		if err != nil {
			return nil, herodot.ErrBadRequest.WithReasonf("invalid course properties: %v", err)
		}
		if errH := validation.ValidatePayload(args.vld, &p); errH != nil {
			return nil, errH
		}
	case db.PageTypeNote:
		p, err := args.properties.AsPagePropertiesNote()
		if err != nil {
			return nil, herodot.ErrBadRequest.WithReasonf("invalid note properties: %v", err)
		}
		if errH := validation.ValidatePayload(args.vld, &p); errH != nil {
			return nil, errH
		}
	case db.PageTypeAssignment:
		p, err := args.properties.AsPagePropertiesAssignment()
		if err != nil {
			return nil, herodot.ErrBadRequest.WithReasonf("invalid assignment properties: %v", err)
		}
		if errH := validation.ValidatePayload(args.vld, &p); errH != nil {
			return nil, errH
		}
	default:
		return nil, herodot.ErrBadRequest.WithReasonf("unsupported page type: %s", args.pageType)
	}

	byteProps, err := json.Marshal(args.properties)
	if err != nil {
		return nil, herodot.ErrBadRequest.WithReasonf("failed to marshal %s properties: %v", args.pageType, err)
	}

	return byteProps, nil
}
