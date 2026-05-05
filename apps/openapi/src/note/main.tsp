import "@typespec/http";

import "../common/error.tsp";
import "../common/response.tsp";
import "./index.tsp";

using TypeSpec.Http;

namespace MyCatatanServices;

@route("/api/notes")
@tag("Notes")
interface NotesService {
    @route("")
    @doc("Create a new note with the specified details.")
    @post
    createNote(
        @doc("The details of the note to create")
        @body
        request: Notes.CreateRequest,
    ): Notes.CreateResponse | CommonError.CreateCommonErrorAuth;

    @route("/l/{courseId}")
    @doc("List all notes accessible to the authenticated user.")
    @get
    listNotes(
        @doc("The unique identifier of the course to filter notes")
        @path
        courseId: string,
    ): Notes.ListResponse | CommonError.GetCommonErrorAuth;

    @route("/{noteId}")
    @doc("Get details of a specific note by its ID.")
    @get
    getNote(
        @doc("The unique identifier of the note")
        @path
        noteId: string,
    ): Notes.DetailResponse | CommonError.GetCommonErrorAuth;

    @route("/{noteId}")
    @doc("Delete a specific note by its ID.")
    @delete
    deleteNote(
        @doc("The unique identifier of the note")
        @path
        noteId: string,
    ): CommonResponse.DeleteResponse | CommonError.DeleteCommonErrorAuth;

    @route("/{noteId}")
    @doc("Update details of a specific note by its ID.")
    @patch
    updateNote(
        @doc("The unique identifier of the note")
        @path
        noteId: string,

        @doc("The details to update for the note")
        @body
        request: Notes.UpdateRequest,
    ): Notes.UpdateResponse | CommonError.UpdateCommonErrorAuth;
}
