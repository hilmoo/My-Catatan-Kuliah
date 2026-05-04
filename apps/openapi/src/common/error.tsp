import "@typespec/http";

using TypeSpec.Http;

namespace CommonError;

@error
@doc("An error response with details about the failure.")
model Error {
  @doc("A unique identifier for this error instance")
  @example("123e4567-e89b-12d3-a456-426614174000")
  id: string;

  @doc("A human-readable explanation of the error")
  @example("Resource Not Found")
  reason: string;

  @doc("The HTTP status code associated with this error")
  @example("Not Found")
  status: string;

  @doc("An optional message providing more details about the error")
  @example("The requested resource could not be found")
  message?: string;

  @doc("An optional machine-readable error code for programmatic handling")
  @example(404)
  code: int32;

  @doc("Optional additional details about the error, such as missing resources or validation errors")
  @example(#{ missingResource: "assignment with ID 123 not found" })
  details?: Record<string>;
}

@error
model Error400 extends Error {
  @statusCode
  code: 400;
}

@error
model Error401 extends Error {
  @statusCode
  code: 401;
}

@error
model Error404 extends Error {
  @statusCode
  code: 404;
}

@error
model Error500 extends Error {
  @statusCode
  code: 500;
}

alias CreateCommonErrorAuth = Error400 | Error401 | Error500;
alias UpdateCommonErrorAuth = Error400 | Error401 | Error404 | Error500;
alias GetCommonErrorAuth = Error401 | Error404 | Error500;
alias ListCommonErrorAuth = Error401 | Error500;
alias DeleteCommonErrorAuth = Error401 | Error404 | Error500;