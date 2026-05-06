import "@typespec/http";

using TypeSpec.Http;
namespace Courses;

model Response {
    @visibility(Lifecycle.Read)
    id: string;

    @visibility(Lifecycle.Read, Lifecycle.Create)
    workspace_id: string;

    title: string;
    instructor: string;
    credits: integer;

    @visibility(Lifecycle.Read)
    created_by: string;

    @visibility(Lifecycle.Read)
    created_at: utcDateTime;

    @visibility(Lifecycle.Read)
    updated_at: utcDateTime;
}

model ListResponse is Array<Response>;

model CreateRequest {
    workspace_id: string;

    @doc("The title of the course")
    title: string;

    @doc("The instructor of the course")
    instructor: string;

    @doc("The number of credits for the course")
    credits?: integer;
}

model CreateResponse extends Response {
    @statusCode
    code: 201;
}

model UpdateRequest is OptionalProperties<UpdateableProperties<Response>>;
