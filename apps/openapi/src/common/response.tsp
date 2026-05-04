import "@typespec/http";

using TypeSpec.Http;

namespace CommonResponse;

model RedirectResponse {
    @statusCode
    code: 302;

    @header("Location")
    location: string;
}

model DeleteResponse {
    @statusCode
    code: 204;
}

model EmptyResponse is DeleteResponse;

model ProxyResponse {
    @body
    body: unknown;
}