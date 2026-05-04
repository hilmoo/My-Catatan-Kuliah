import "@typespec/http";

using TypeSpec.Http;
namespace Files;

model Response {
    id: string;
    size_bytes: integer;
    mime_type: string;
    url: string;
}

model CreateRequest {
    size_bytes: integer;
    mime_type: string;
}

model CreateResponse extends Response {
    @statusCode
    code: 201;
}
