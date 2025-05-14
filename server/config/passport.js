const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy; 
//console.log("Google Strategy initialized-------------passport.js file"); 
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { LEGAL_TCP_SOCKET_OPTIONS } = require("mongodb");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `https://chatbot-5hyt.onrender.com/api/auth/google/callback`,
      scope: ["profile", "email", "https://www.googleapis.com/auth/calendar","https://www.googleapis.com/auth/calendar.readonly"],
      prompt: "consent", 
      accessType: "offline", 
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });


        if (!user) { 
          //console.log("Creating new user with Google ID:", profile.id); 

          const hashedPassword = await bcrypt.hash(profile.emails[0].value, 12);
          user = new User({
            googleId: profile.id,
            username: profile.displayName,
            email: profile.emails[0].value,
            password: hashedPassword,
            accessToken,
            refreshToken,
          });
          await user.save();
        }
        else if (!refreshToken) {
          refreshToken= refreshToken;
        } 
        else {

        user.accessToken = accessToken; 
        //console.log("Access token updated for user:", user.email, user.accessToken); // Log access token update

        user.refreshToken =  refreshToken; 
        //console.log("Refresh token updated for user:", user.email, user.refreshToken); // Log refresh token update

          try {
            await user.save();
          } catch (saveError) {
            console.error("Error saving user:", saveError); // ✅ Log errors
            done(saveError, null);
          }
        }

        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});





