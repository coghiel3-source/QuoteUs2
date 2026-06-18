import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { Express } from "express";
import session from "express-session";
import { storage } from "./storage";

export function setupGoogleAuth(app: Express) {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientID || !clientSecret) {
    console.log("[Google Auth] Google OAuth credentials not configured - Google sign-in disabled");
    return;
  }

  const callbackURL = process.env.APP_BASE_URL
    ? `${process.env.APP_BASE_URL.replace(/\/$/, "")}/api/auth/google/callback`
    : process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`
    : process.env.REPLIT_DOMAINS
    ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/api/auth/google/callback`
    : "http://localhost:5000/api/auth/google/callback";

  console.log("[Google Auth] Callback URL:", callbackURL);

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "quoteus-session-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName || `${profile.name?.givenName || ""} ${profile.name?.familyName || ""}`.trim();
          const googleId = profile.id;

          if (!email) {
            return done(new Error("No email found in Google profile"), undefined);
          }

          let user = await storage.getUserByEmail(email);

          if (user) {
            if (user.role !== "customer") {
              return done(new Error("Google sign-in is only available for customers. Please use email/password login."), undefined);
            }
            if (!user.googleId) {
              user = await storage.updateUser(user.id, { googleId });
            }
          } else {
            user = await storage.createUser({
              name,
              email,
              password: "",
              role: "customer",
              status: "active",
              googleId,
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  app.get("/api/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/profile?error=google_auth_failed" }),
    (req, res) => {
      const user = req.user as any;
      res.redirect(`/profile?google_auth=success&user_id=${user.id}`);
    }
  );

  app.get("/api/auth/google/user", (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  console.log("[Google Auth] Google OAuth configured successfully");
}
