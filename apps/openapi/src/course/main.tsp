import "@typespec/http";

import "../common/error.tsp";
import "../common/response.tsp";
import "./index.tsp";

using TypeSpec.Http;

namespace MyCatatanServices;

@route("/api/courses")
@tag("Courses")
interface CoursesService {
    @route("")
    @doc("Create a new course with the specified details.")
    @post
    createCourse(
        @doc("The details of the course to create")
        @body
        request: Courses.CreateRequest,
    ): Courses.CreateResponse | CommonError.CreateCommonErrorAuth;

    @route("")
    @doc("List all courses accessible to the authenticated user.")
    @get
    listCourses(): Courses.ListResponse | CommonError.GetCommonErrorAuth;

    @route("/{courseId}")
    @doc("Get details of a specific course by its ID.")
    @get
    getCourse(
        @doc("The unique identifier of the course")
        @path
        courseId: string,
    ): Courses.Response | CommonError.GetCommonErrorAuth;

    @route("/{courseId}")
    @doc("Delete a specific course by its ID.")
    @delete
    deleteCourse(
        @doc("The unique identifier of the course")
        @path
        courseId: string,
    ): CommonResponse.DeleteResponse | CommonError.DeleteCommonErrorAuth;

    @route("/{courseId}")
    @doc("Update details of a specific course by its ID.")
    @patch
    updateCourse(
        @doc("The unique identifier of the course")
        @path
        courseId: string,

        @doc("The details to update for the course")
        @body
        request: Courses.UpdateRequest,
    ): Courses.Response | CommonError.UpdateCommonErrorAuth;
}
