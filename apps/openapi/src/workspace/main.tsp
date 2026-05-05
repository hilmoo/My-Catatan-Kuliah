import "@typespec/http";

import "../common/error.tsp";
import "../common/response.tsp";
import "./index.tsp";

using TypeSpec.Http;

namespace MyCatatanServices;

@route("/api/workspaces")
@tag("Workspaces")
interface WorkspacesService {
    @route("")
    @doc("Create a new workspace with the specified name.")
    @post
    createWorkspace(
        @doc("The name of the workspace to create")
        @body
        request: Workspaces.CreateRequest,
    ): Workspaces.CreateResponse | CommonError.CreateCommonErrorAuth;

    @route("")
    @doc("List all workspaces accessible to the authenticated user.")
    @get
    listWorkspaces(): Workspaces.ListResponse | CommonError.GetCommonErrorAuth;

    @route("/{workspaceId}")
    @doc("Get details of a specific workspace by its ID.")
    @get
    getWorkspace(
        @doc("The unique identifier of the workspace")
        @path
        workspaceId: string,
    ): Workspaces.Response | CommonError.GetCommonErrorAuth;

    @route("/{workspaceId}")
    @doc("Delete a specific workspace by its ID.")
    @delete
    deleteWorkspace(
        @doc("The unique identifier of the workspace")
        @path
        workspaceId: string,
    ): CommonResponse.DeleteResponse | CommonError.DeleteCommonErrorAuth;

    @route("/{workspaceId}")
    @doc("Update the name of a specific workspace by its ID.")
    @patch
    updateWorkspace(
        @doc("The unique identifier of the workspace")
        @path
        workspaceId: string,

        @doc("The new name for the workspace")
        @body
        request: Workspaces.UpdateRequest,
    ): Workspaces.Response | CommonError.UpdateCommonErrorAuth;
}
