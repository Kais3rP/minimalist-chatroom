const session     = require('express-session');
const mongo       = require('mongodb').MongoClient;
const passport    = require('passport');
const GitHubStrategy = require('passport-github').Strategy;
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const ObjectId = require('mongodb').ObjectID;

module.exports = function (app, db) {
  
    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser((user, done) => {
      console.log(user)
      if (user.id) done(null, user.id)
      else done(null, user._id.concat('local'));
    
    });

    passport.deserializeUser((id, done) => {
      console.log(id)
      if (/Object/.test(id)) db.collection('chatusers').findOne(
            {_id: id},
            (err, doc) => {
                done(null, doc);
            }
        )
      else db.collection('chatusers').findOne(
            {id: id},
            (err, doc) => {
                done(null, doc);
            }
        );
    });
  
  //Local Strategy
passport.use(
    new LocalStrategy(async function(username, password, done) {
      try {
        let user = await db.collection("chatusers").findOne({ username: username });
        console.log("User " + username + " attempted to log in.");

        if (!user) {
          console.log("User non registered");
          return done(null, false);
        }
        let passwordIsValid = await bcrypt.compareSync(password, user.password);
        if (!passwordIsValid) {
          console.log("Wrong Password");
          return done(null, false);
        } //password wrong { return done(null, false); }
        
        
        return done(null, user);
      } catch {
        return done("Error");
      }
    })
  );
//Google Strategy
    passport.use(new GoogleStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "https://minimalist-chat.glitch.me/auth/google/callback",
            passReqToCallback   : true
          },
                                        
          function(request, accessToken, refreshToken, profile, cb) {  //passport-google wants request parameter
            db.collection('chatusers').findAndModify(
                  {id: profile.id},
                  {},
                  {$setOnInsert:{
                      id: profile.id,
                      name: profile.displayName || 'John Doe',
                      photo: profile.photos[0].value || '',
                      created_on: new Date(),
                      provider: profile.provider || ''
                  },$set:{
                      last_login: new Date()
                  },$inc:{
                      login_count: 1
                  }},
                  {upsert:true, new: true}, //Insert object if not found, Return new object after modify
                  function (err, doc) {
                      return cb(null, doc.value);
                  }
              );
            }
        ));
  
  //Github Strategy
    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: 'https://minimalist-chat.glitch.me/auth/github/callback'
       
      },
      function(accessToken, refreshToken, profile, cb) {
          db.collection('chatusers').findAndModify(
              {id: profile.id},
              {},
              {$setOnInsert:{
                  id: profile.id,
                  name: profile.displayName || 'Anonymous',
                  photo: profile.photos[0].value || '',
                  email: profile.emails ? profile.emails[0].value || 'No public email' : null,
                  created_on: new Date(),
                  provider: profile.provider || '',
                  chat_messages: 0
              },$set:{
                  last_login: new Date()
              },$inc:{
                  login_count: 1
              }},
              {upsert:true, new: true}, //Insert object if not found, Return new object after modify
              (err, doc) => {
                  return cb(null, doc.value);
              }
          );
        }
    ));
  
}