import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import passport from "passport";
import { User } from "../model/user.model.js";

export const connectPassport = () => {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.OAUTH_GOOGLE_CLIENT_ID,
                clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
                callbackURL: process.env.OAUTH_GOOGLE_CALLBACK_URL,
            },
            async function (accessToken, refreshToken, profile, done) {
                // database
                const user = await User.findOne({
                    googleId: profile.id,
                });
                console.log("accessToken : ", accessToken);
                console.log("refreshToken : ", accessToken);
                console.log("profile : ", profile);
                if (!user) {
                    const googleId = profile.id;
                    const username = googleId + profile.emails[0].value;
                    const newUser = await User.create({
                        googleId,
                        username,
                        refreshToken,
                        fullName: profile.displayName,
                        avatar: profile.photos[0].value,
                        email: profile.emails[0].value,
                    });
                    return done(null, newUser);
                } else {
                    return done(null, user);
                }
            }
        )
    );
};

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});
