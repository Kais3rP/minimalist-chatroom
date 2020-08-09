let form = document.querySelector("form");
let input = document.getElementById("input");
let currentUsers = document.getElementById("num-users");
let messages = document.getElementById("messages");
let nameUsers = document.getElementById("name-users");
let userData;
/*global io*/
var socket = io(); //This sends a 'connection' event to the io listening on server, sending the socket as data

document.addEventListener("DOMContentLoaded", function() {
  //Listen to the event 'user count' from the server
  socket.on("user", function(data) {
    let message;
    userData = data;
   
    if (data.connected) message = `${data.name} has joined the chat.`;
    else message = `${data.name} has left the chat.`;
    
    //prints user info
    currentUsers.innerText = `Number of users connected: ${data.currentUsers}`;
    let infoUser = `<b> ${message} <\/b>`;
    createAndAppendLi(messages, infoUser);
    
    //Listener for chat messages
     socket.on("chat message", function(data) {
      console.log(
        "message received from " + data.name + " content " + data.message
      );
      console.log(messages);
      createAndAppendLi(messages, data.message);
      
       //scroll the window to the bottom
       messages.scrollTop = messages.scrollHeight;
    });
  });

  // Form submittion with new message in field with id 'm'
  form.onsubmit = function() {
    console.log("form submitting");
    var messageToSend = input.value;
    //send message to server here?
    socket.emit("chat message", { message: messageToSend, name: userData.name });
    
    //resets the input field
    input.value = "";
    
    return false; // prevent form submit from refreshing page
  };
});

function createAndAppendLi(elem, message) {
  let li = document.createElement("li");
  li.innerHTML = message;
  elem.appendChild(li);
}
