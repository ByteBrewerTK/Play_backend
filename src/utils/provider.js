import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import passport from "passport";
import { User } from "../model/user.model.js";

export const connectPassport = () => {
    console.log(process.env.OAUTH_GOOGLE_CLIENT_ID);
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.OAUTH_GOOGLE_CLIENT_ID,
                clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
                callbackURL: process.env.OAUTH_GOOGLE_CALLBACK_URL,
            },
            async function (accessToken, refreshToken, profile, done) {
                // database
                console.log("Profile : ",profile);
                const user = await User.findOne({
                    googleId: profile._id,
                });
                if (!user) {
                    const googleId = profile.id;
                    const username = profile._id + googleId.toLowercase;
                    const newUser = await User.create({
                        googleId: profile.id,
                        fullName: profile.displayName,
                        avatar: profile.photos[0].value,
                        email: profile.email,
                        username,
                    });
                    console.log("User : ", newUser);
                    return done(null, newUser);
                } else {
                    console.log("Founded User : ", user);
                    return done(null, user);
                }
            }
        )
    );
};

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (user, done) => {
    done(null, user);
});
