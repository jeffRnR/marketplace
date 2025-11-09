// middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/",
  },
});

export const config = {
  matcher: [
    // Protected routes only
    "/dashboard/:path*",
    "/events/create/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/my-events/:path*",
    // Add any other routes that require authentication
  ],
};3