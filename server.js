"use strict";

const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const auth = require("./app/auth.js");
const routes = require("./app/routes.js");
const mongo = require("mongodb").MongoClient;
const passport = require("passport");
const cookieParser = require("cookie-parser");
const app = express();
const http = require("http").Server(app);
const sessionStore = new session.MemoryStore(); //Store in memory, not a good idea for memory leak
const io = require("socket.io")(http);
const passportSocketIo = require("passport.socketio");

app.use("/public", express.static(process.cwd() + "/public"));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "pug");

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    key: "express.sid",
    store: sessionStore
  })
);

io.use(
  passportSocketIo.authorize({
    //This middleware reads the cookies from the client and passes it to socket.io without need to
    cookieParser: cookieParser, //read from req.user or req.session because there are no rest calls in web socket communication.
    key: "express.sid",
    secret: process.env.SESSION_SECRET,
    store: sessionStore
  })
);

mongo.connect(process.env.MONGO_URI, (err, client) => {
  var db = client.db("chatusers");
  if (err) console.log("Database error: " + err);

  auth(app, db);
  routes(app, db);

  http.listen(process.env.PORT || 3000);
  //------------------------------------------------------------------
  //Start ioSocket
  //Store the number of currentusers connected
  var currentUsers = 0;
  var usersList = {};
  var roomsList = ['main'];

  //This is an event listener for the first socket request that is not http, but thanks to passportSocketIo middleware it carries session user info
  io.on("connection", socket => {
    let currentRoom = "main";
    socket.join(currentRoom); //As a new socket connects it joins to "main" room
    let userName = socket.request.user.name
      ? socket.request.user.name
      : socket.request.user.username;
    usersList[currentRoom] = usersList[currentRoom] || [];
    usersList[currentRoom].push(userName); //Push the user connected to the usersList
    currentUsers++; //Increment the counter of Users at every connection

    console.log(`User ${socket.request.user.name} has connected.`);
    
    
    /*** Emitting info upon every new socket connection***/
    
     //------------------------------------------------------------------
    //emits user info to the main room upon the first connection

    io.to(currentRoom).emit("users list", {
      usersList: usersList[currentRoom]
    }); 
    
    //Emits the user info of the new connected socket

    io.emit("user", {
      name: userName,
      currentUsers: currentUsers,
      connected: true,
      room: currentRoom,
  
    });
    //emits the username of the socket only to the particular socket so it can save it clientside
    socket.emit("username", { name: userName });
    
    
    /*** ---------------------o--------------------------------***/
    //-------------------------------------------------------
    //Manage disconnection of a connected socket
    socket.on("disconnect", () => {
      currentUsers--;
      usersList[currentRoom].splice(
        usersList[currentRoom].indexOf(userName),
        1
      );
   
      
        
      //Updates rooms list removing the room from the list if it becomes empty upon disconnection
      if (usersList[currentRoom].length === 0) roomsList.splice(roomsList.indexOf(currentRoom),1)
      //Sends user disconnect info to all the sockets and the updated roomsList
      socket.emit("user", {
        name: userName,
        currentUsers: currentUsers,
        connected: false,
        roomsList: roomsList
      });
      //Updates the userlist to the specific socket room
      socket.to(currentRoom).emit("users list", {
        usersList: usersList[currentRoom]
      });
    
      console.log("user disconnected");
    });

    //---------------------------------------------------------

    //listen for messages incoming
    //Takes the message from the specific socket connected and emits it to all the sockets with io.emit
    socket.on("chat message", data => {
      console.log(
        "message received from " + data.name + " content " + data.message
      );
      //emits back the message to all the client sockets in the specific room

      io.to(data.room).emit("chat message", {
        name: data.name,
        message: data.message
      });
    });

    //--------------------------------------------------------
    //Manage rooms joining

    socket.on("join room", data => {
      
      
      socket.leave(currentRoom); //Leaves the previous room and joins the new one
      socket.join(data.room);

      //Creates a new users list and updates the previous one

      usersList[data.room] = usersList[data.room] || [];
      usersList[data.room].push(userName);
      usersList[currentRoom].splice(usersList[currentRoom].indexOf(userName),1);
      
      console.log(roomsList)
      if(!roomsList.includes(data.room)) roomsList.push(data.room); //Adds a  new room if it doesn't  exist
      if (usersList[currentRoom].length === 0) roomsList.splice(roomsList.indexOf(currentRoom),1) //Checks if the previous room became empty upon change
      
      console.log(usersList)
      console.log(currentRoom)
      console.log(roomsList)

      //emits user info to all the sockets to show info to all the sockets when a user changes the room
      //It emits also the new roomsList
      io.emit("user", {
        name: userName,
        currentUsers: currentUsers,
        connected: true,
        room: data.room,
        roomsList: roomsList
      });
//Updates usersList on the new room socket clients
      io.to(data.room).emit("users list", {
        usersList: usersList[data.room]
      });

      //emits the modified users list to the previous room
      io.to(currentRoom).emit("users list", {
        usersList: usersList[currentRoom]
      });
      //Updates the currentRoom value of the socket
      currentRoom = data.room;
    });

    //--------------------------------------------------------
    //Manage private messaging from client sockets

    socket.on("say to someone", (id, msg) => {
      socket.to(id).emit("my message", msg);
    });

   
  });
});
