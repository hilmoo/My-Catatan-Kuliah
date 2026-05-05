import "@typespec/http";

import "../common/error.tsp";
import "../common/response.tsp";
import "./index.tsp";

using TypeSpec.Http;

namespace MyCatatanServices;

@route("/api/assignments")
@tag("Assignments")
interface AssignmentsService {
    @route("")
    @doc("Create a new assignment with the specified details.")
    @post
    createAssignment(
        @doc("The details of the assignment to create")
        @body
        request: Assignments.CreateRequest,
    ): Assignments.CreateResponse | CommonError.CreateCommonErrorAuth;

    @route("/{courseId}")
    @doc("List all assignments accessible to the authenticated user.")
    @get
    listAssignments(
        @doc("The unique identifier of the course to filter assignments")
        @path
        courseId: string,
    ): Assignments.ListResponse | CommonError.GetCommonErrorAuth;

    @route("/{assignmentId}")
    @doc("Get details of a specific assignment by its ID.")
    @get
    getAssignment(
        @doc("The unique identifier of the assignment")
        @path
        assignmentId: string,
    ): Assignments.DetailResponse | CommonError.GetCommonErrorAuth;

    @route("/{assignmentId}")
    @doc("Delete a specific assignment by its ID.")
    @delete
    deleteAssignment(
        @doc("The unique identifier of the assignment")
        @path
        assignmentId: string,
    ): CommonResponse.DeleteResponse | CommonError.DeleteCommonErrorAuth;

    @route("/{assignmentId}")
    @doc("Update details of a specific assignment by its ID.")
    @patch
    updateAssignment(
        @doc("The unique identifier of the assignment")
        @path
        assignmentId: string,

        @doc("The details to update for the assignment")
        @body
        request: Assignments.UpdateRequest,
    ): Assignments.UpdateResponse | CommonError.UpdateCommonErrorAuth;
}
