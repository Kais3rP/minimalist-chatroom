const passport = require("passport");
const bcrypt = require("bcrypt");
const ObjectId = require("mongodb").ObjectID;

module.exports = function(app, db) {
  //Local Registration/Login Routes
  app.route("/register").post(async (req, res) => {
    try {
      let user = await db
        .collection("chatusers")
        .findOne({ username: req.body.username });
      if (user) return res.redirect("/");
      //If user doesn't exist we create one
      let hashedPwd = bcrypt.hashSync(req.body.password, 8); //crpyting pwd
      let userDb = await db.collection("chatusers").insertOne({
        username: req.body.username,
        password: hashedPwd
      });
      res.render(process.cwd() + "/views/pug/index", {
        showRegistration: false,
        showLogin: true
      });
    } catch {
      console.log("Error retrieving/creating user from the db");
      return res.redirect("/");
    }
  });

  //Login route when trying to login
  app
    .route("/login")
    .post(
      passport.authenticate("local", { failureRedirect: "/" }),
      (req, res) => {
        res.redirect("/chat");
      }
    );

  //Google OAuth2 route
  app.route("/auth/google").get(
    passport.authenticate("google", {
      scope: [
        "https://www.googleapis.com/auth/plus.login",
        ,
        "https://www.googleapis.com/auth/plus.profile.emails.read"
      ]
    })
  ); //Google wants an options object with a scope property

  app
    .route("/auth/google/callback")
    .get(
      passport.authenticate("google", { failureRedirect: "/" }),
      (req, res) => {
        res.redirect("/chat");
      }
    );

  //GitHub routes
  app.route("/auth/github").get(passport.authenticate("github"));

  app
    .route("/auth/github/callback")
    .get(
      passport.authenticate("github", { failureRedirect: "/" }),
      (req, res) => {
        req.session.user_id = req.user.id;
        res.redirect("/chat");
      }
    );

  app.route("/").get((req, res) => {
    res.render(process.cwd() + "/views/pug/index", {
      showRegistration: true,
      showLogin: true
    });
  });

  app.route("/chat").get(helperFunctions.ensureAuthenticated, (req, res) => {
    console.log("it comes here");
    res.render(process.cwd() + "/views/pug/chat", { user: req.user });
  });

  app.route("/logout").get((req, res) => {
    req.logout();
    res.redirect("/");
  });

  app.use((req, res, next) => {
    res
      .status(404)
      .type("text")
      .send("Not Found");
  });
};

var helperFunctions = {
  parseDate: function(date) {
    return /^.+(?= GMT)/.exec(date);
  },

  ensureAuthenticated: function(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    console.log(req.isAuthenticated());
    res.redirect("/");
  }
};
