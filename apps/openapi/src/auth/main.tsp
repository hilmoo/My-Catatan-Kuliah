import "@typespec/http";

import "../common/error.tsp";
import "../common/response.tsp";
import "./me.tsp";

using TypeSpec.Http;

namespace MyCatatanServices;

@route("/api/auth")
@tag("Auth")
interface Auth {
    @doc("Initiate the Google OAuth2 authentication flow by redirecting the user to Google's authorization endpoint.")
    @useAuth(NoAuth)
    @get
    @route("/google")
    googleRedirect(): CommonResponse.RedirectResponse;

    @doc("Callback endpoint for Google OAuth2 authentication flow. Receives the authorization code and state parameters from Google after user authentication.")
    @useAuth(NoAuth)
    @get
    @route("/google/callback")
    googleCallback(
        @doc("The authorization code returned by Google after user authentication")
        @query
        code: string,

        @doc("The state parameter returned by Google, used to maintain state between the request and callback")
        @query
        state: string,
    ): CommonResponse.RedirectResponse;

    @doc("Get the authenticated user's information, including their unique identifier, email address, display name, and avatar URL.")
    @get
    @route("/me")
    getMe(): AuthMe.Response | CommonError.Error401;

    @doc("Log out the authenticated user by clearing their session or authentication tokens, and redirecting them to root")
    @post
    @route("/logout")
    logout(): CommonResponse.RedirectResponse;
}