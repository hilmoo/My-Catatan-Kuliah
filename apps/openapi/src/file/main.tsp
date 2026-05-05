import "@typespec/http";

import "../common/error.tsp";
import "../common/response.tsp";
import "./index.tsp";

using TypeSpec.Http;

namespace MyCatatanServices;

@route("/api/files")
@tag("Files")
interface FilesService {
    @route("/{fileId}")
    @doc("Get the details of a specific file by its unique identifier, including its name, size, type, and download URL.")
    @get
    getFile(
        @doc("The unique identifier of the file to retrieve")
        @path
        fileId: string,
    ): Files.Response | CommonError.GetCommonErrorAuth;

    @route("")
    @doc("Upload a new file to the system. The request should include the file's name, size in bytes, MIME type, and the file content itself. The response will include the unique identifier for the newly created file, along with its details and a URL for downloading it.")
    @post
    createFile(
        @doc("The details of the file to be created, including its name, size in bytes, MIME type, and content")
        @body
        request: Files.CreateRequest,
    ): Files.CreateResponse | CommonError.CreateCommonErrorAuth;

    @route("/{fileId}")
    @doc("Delete a specific file from the system using its unique identifier. This operation will permanently remove the file and its associated data. The response will indicate whether the deletion was successful or if the file was not found.")
    @delete
    deleteFile(
        @doc("The unique identifier of the file to delete")
        @path
        fileId: string,
    ): CommonResponse.DeleteResponse | CommonError.DeleteCommonErrorAuth;
}
