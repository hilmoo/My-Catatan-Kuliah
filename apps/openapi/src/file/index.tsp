import "@typespec/http";

using TypeSpec.Http;
namespace Files;

model Response {
    id: string;
    size_bytes: integer;
    mime_type: string;
    url: string;
    width?: integer | null;
    height?: integer | null;
}

model CreateRequest {
    size_bytes: integer;
    mime_type: string;
    width?: integer | null;
    height?: integer | null;
}

model CreateResponse extends Response {
    @statusCode
    code: 201;
}
