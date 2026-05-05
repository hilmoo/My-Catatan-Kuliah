import "@typespec/http";
import "@typespec/openapi";
import "@typespec/openapi3";

namespace AuthMe;

model Response {
    @doc("The unique identifier for the authenticated user")
    id: string;

    @doc("The email address of the authenticated user")
    email: string;

    @doc("The display name of the authenticated user")
    name: string;

    @doc("The URL of the authenticated user's avatar image")
    avatar_url: string;
}