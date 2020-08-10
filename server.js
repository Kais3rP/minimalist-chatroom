'use strict';

const express     = require('express');
const session     = require('express-session');
const bodyParser  = require('body-parser');
const auth        = require('./app/auth.js');
const routes      = require('./app/routes.js');
const mongo       = require('mongodb').MongoClient;
const passport    = require('passport');
const cookieParser= require('cookie-parser')
const app         = express();
const http        = require('http').Server(app);
const sessionStore= new session.MemoryStore();  //Store in memory, not a good idea for memory leak
const io = require('socket.io')(http);
const passportSocketIo = require('passport.socketio');

app.use('/public', express.static(process.cwd() + '/public'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'pug')

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  key: 'express.sid',
  store: sessionStore,
}));

io.use(passportSocketIo.authorize({   //This middleware reads the cookies from the client and passes it to socket.io without need to
  cookieParser: cookieParser,         //read from req.user or req.session because there are no rest calls in web socket communication.    
  key:          'express.sid',
  secret:       process.env.SESSION_SECRET,
  store:        sessionStore
}));



mongo.connect(process.env.MONGO_URI, (err, client) => {
  var db = client.db('chatusers');
    if(err) console.log('Database error: ' + err);
  
    auth(app, db);
    routes(app, db);
      
    http.listen(process.env.PORT || 3000);

  //Start ioSocket
  //Store the number of currentusers connected
  var currentUsers = 0;
  var usersList = 
  //This is an event listener for the first socket request that is not http, but thanks to passportSocketIo middleware it carries session user info
  io.on('connection', (socket)=>{   
    console.log(socket.request.user)
    let userName = socket.request.user.name ? socket.request.user.name : socket.request.user.username;
    currentUsers++; //Increment the counter of Users at every connection
    console.log(`User ${socket.request.user.name} has connected.`);
    //Manage disconnection
    socket.on('disconnect', () => {
      currentUsers--;
      io.emit('user', {name: userName, currentUsers: currentUsers, connected: false})
      console.log('user disconnected');
      
  });
    //emits user info
    io.emit('user', {name: userName, currentUsers: currentUsers, connected: true}); //Emits an event to all the socket clients with the variable currentUsers
    socket.emit('username', {name: userName});
     //listen for messages incoming
    //Takes the message from the specific socket connected and emits it to all the sockets with io.emit
    socket.on('chat message', (data) => {
      console.log('message received from ' + data.name + ' content ' + data.message)
      //emits back the message to all the client sockets
      io.emit('chat message', {name: data.name, message: data.message})
    })
   });
  
  
 
  
});
