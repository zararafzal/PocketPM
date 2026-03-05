// IMPORTANT: CLERK_JWT_ISSUER_DOMAIN must be set as a Convex environment variable.
// This is SEPARATE from your Next.js .env file.
// Run: npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-app.clerk.accounts.dev
//
// Find your domain in Clerk Dashboard → API Keys → "Clerk Frontend API" URL

const domain = process.env.CLERK_JWT_ISSUER_DOMAIN;

if (!domain) {
  // This will surface as a Convex deployment error — intentional to fail loudly
  console.error(
    "CLERK_JWT_ISSUER_DOMAIN is not set. Run: npx convex env set CLERK_JWT_ISSUER_DOMAIN <your-clerk-frontend-api-url>"
  );
}

export default {
  providers: [
    {
      domain: domain ?? "",
      applicationID: "convex",
    },
  ],
};
