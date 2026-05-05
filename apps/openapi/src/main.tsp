import "@typespec/http";
import "@typespec/openapi";

import "./assignment/";
import "./auth/";
import "./course/";
import "./file/";
import "./note/";
import "./workspace/";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

@service(#{ title: "My Catatan Kuliah" })
@info(#{ version: "1.0.0" })
@doc("My Catatan Kuliah API")
@server("/", "Default server")
@tagMetadata(
    "Workspaces",
    #{
        description: "A service for managing workspaces, including creation, retrieval, updating, and deletion.",
    }
)
@tagMetadata(
    "Notes",
    #{
        description: "A service for managing notes, including creation, retrieval, updating, and deletion.",
    }
)
@tagMetadata(
    "Files",
    #{
        description: "A service for handling file uploads and downloads, including integration with AWS S3.",
    }
)
@tagMetadata(
    "Courses",
    #{
        description: "A service for managing courses, including creation, retrieval, updating, and deletion.",
    }
)
@tagMetadata(
    "Auth",
    #{
        description: "A service for handling authentication, including Google OAuth2.",
    }
)
@tagMetadata(
    "Assignments",
    #{
        description: "A service for managing assignments, including creation, retrieval, updating, and deletion.",
    }
)
@useAuth(ApiKeyAuth<ApiKeyLocation.cookie, "session">)
namespace MyCatatanServices {

}
