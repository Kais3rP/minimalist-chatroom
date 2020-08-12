//-------DOM Selectors --------------------------

let form = document.querySelector("form");
let input = document.getElementById("input");
let currentUsers = document.getElementById("num-users");
let messages = document.getElementById("messages");
let usersList = document.getElementById("users-list");
let nameUsers = document.getElementById("name-users");
let roomsInput = document.getElementById('rooms-input');
let roomsButton= document.getElementById('rooms-btn');
let roomsListDiv = document.getElementById('rooms-list');


//-----------------------------------------------------------
let usersListTitle = "<h4>Users List:</h4>";
let currentRoom ='main';
let roomsList = ['main']
let userName;

/*global io*/
var socket = io(); //This sends a 'connection' event to the io listening on server, sending the socket as data

document.addEventListener("DOMContentLoaded", function() {
  //-------------------------------------------------------------------------------------------------------------------------//
  //This happens whenever a new user connects/disconnects //
  //Listen to the event 'user' from the server sent to all the sockets connected once a new socket connects or disconnects
  socket.on("user", function(data) {
    currentRoom = data.room;
    let message;
    console.log(data.connected);
    if (data.connected) message = `${data.name} has joined ${currentRoom}.`;
    else message = `${data.name} has left the chat.`;

    //prints user info
    currentUsers.innerText = `Number of users connected: ${data.currentUsers}`;
    let infoUser = `<b> ${message} <\/b>`;                                        
    createAndAppendLi(messages, infoUser);
    //Checks if user events carries roomsList info
    if (data.roomsList) roomsList = data.roomsList
    //Extracts roomsList info from the user event
    roomsListDiv.innerHTML = ''; //resets the value at every user event
    roomsList.forEach(x => createAndAppendLi(roomsListDiv, x))
  });
  
  //---------------------------------------------------------------
  //Listens for the users list info
  socket.on('users list', (data)=> {
      usersList.innerHTML = `${usersListTitle} ${data.usersList.map(
      x => `<li>${x}</li>`
    )}`;
  })
 //-------------------------------------------------------------------------------------------------------------------------//
  //This happens whenever a user sends a public message //
  //Listener for incoming chat messages
  socket.on("chat message", function(data) {
    console.log(
      "message received from " + data.name + " content " + data.message
    );
    console.log(messages);
    createAndAppendLi(messages, data.message, data.name);

    //scroll the window to the bottom
    messages.scrollTop = messages.scrollHeight;
  });
 //-------------------------------------------------------------------------------------------------------------------------//
  //This happens whenever this client connects and receives his own username//
  //Listen to the specific username of the user of the session
  socket.on("username", function(data) {
    userName = data.name;
  });

  // Form submitting the new message to the server
  form.onsubmit = function() {
    var messageToSend = input.value;
    socket.emit("chat message", { message: messageToSend, name: userName, room: currentRoom });
    input.value = "";
    return false; // prevent form submit from refreshing page
  };
  
  
  //manage the rooms change:
  roomsButton.onclick = () => { 
    currentRoom = roomsInput.value;
    socket.emit('join room', {room: roomsInput.value}) }
});

function createAndAppendLi(elem, message, username) {
  let li = document.createElement("li");
  if (username) {
    li.setAttribute("id", username);
    li.innerHTML = `${username}: ${message}`;
  } else {
    li.setAttribute("id", message);
    li.innerHTML = message;
  }
  elem.appendChild(li);
}

function removeLi() {}
