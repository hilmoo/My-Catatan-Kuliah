import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup } from "@/components/ui/field";
import { getAuthGoogleRedirectUrl } from "@/api/auth/auth";

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <div className="flex flex-col items-center gap-2">
            <a href="/" className="flex flex-col items-center gap-2 font-medium">
              <div className="flex h-12 w-12 items-center justify-center rounded-md">
                {/* Fixed the size class here */}
                <img src="/favicon.svg" alt="My Catatan Kuliah" className="size-full object-contain" />
              </div>
              <span className="sr-only">My Catatan Kuliah</span>
            </a>
            <CardTitle className="text-xl">Welcome to My Catatan Kuliah</CardTitle>
            <CardDescription>Login with your Google account to get started</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form>
            <FieldGroup>
              <Field>
                <Button
                  variant="outline"
                  type="button"
                  className="w-full"
                  onClick={() => {
                    window.location.href = getAuthGoogleRedirectUrl();
                  }}
                >
                  <GoogleIcon />
                  Login with Google
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16">
      <g fill="none" fillRule="evenodd" clipRule="evenodd">
        <path
          fill="#f44336"
          d="M7.209 1.061c.725-.081 1.154-.081 1.933 0a6.57 6.57 0 0 1 3.65 1.82a100 100 0 0 0-1.986 1.93q-1.876-1.59-4.188-.734q-1.696.78-2.362 2.528a78 78 0 0 1-2.148-1.658a.26.26 0 0 0-.16-.027q1.683-3.245 5.26-3.86"
          opacity={0.987}
        ></path>
        <path
          fill="#ffc107"
          d="M1.946 4.92q.085-.013.161.027a78 78 0 0 0 2.148 1.658A7.6 7.6 0 0 0 4.04 7.99q.037.678.215 1.331L2 11.116Q.527 8.038 1.946 4.92"
          opacity={0.997}
        ></path>
        <path
          fill="#448aff"
          d="M12.685 13.29a26 26 0 0 0-2.202-1.74q1.15-.812 1.396-2.228H8.122V6.713q3.25-.027 6.497.055q.616 3.345-1.423 6.032a7 7 0 0 1-.51.49"
          opacity={0.999}
        ></path>
        <path
          fill="#43a047"
          d="M4.255 9.322q1.23 3.057 4.51 2.854a3.94 3.94 0 0 0 1.718-.626q1.148.812 2.202 1.74a6.62 6.62 0 0 1-4.027 1.684a6.4 6.4 0 0 1-1.02 0Q3.82 14.524 2 11.116z"
          opacity={0.993}
        ></path>
      </g>
    </svg>
  );
}