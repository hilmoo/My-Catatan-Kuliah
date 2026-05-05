import "@typespec/http";

using TypeSpec.Http;
namespace Workspaces;

model Response {
    id: string;
    name: string;
    owner_id: string;
    created_at: string;
}

model ListResponse is Array<Response>;

model CreateRequest {
    name: string;
}

model CreateResponse extends Response {
    @statusCode
    code: 201;
}

model UpdateRequest {
    name: string;
}