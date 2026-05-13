import "@typespec/http";

using TypeSpec.Http;
namespace Notes;

model Response {
    @visibility(Lifecycle.Read)
    id: string;

    @visibility(Lifecycle.Read, Lifecycle.Create)
    course_id: string;

    title: string;

    @format("hexcolor")
    color?: string;

    position: float;

    @visibility(Lifecycle.Read)
    created_by: string;

    @visibility(Lifecycle.Read)
    created_at: utcDateTime;

    @visibility(Lifecycle.Read)
    updated_at: utcDateTime;
}

model ListResponse is Array<Response>;

model DetailResponse {
    ...Response;
    content?: string;
}

model CreateRequest is Create<DetailResponse>;

model CreateResponse extends DetailResponse {
    @statusCode
    code: 201;
}

model UpdateRequest is OptionalProperties<UpdateableProperties<DetailResponse>>;

model UpdateResponse extends DetailResponse {
    @statusCode
    code: 200;
}