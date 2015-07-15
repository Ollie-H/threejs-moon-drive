/* Author: YOUR NAME HERE
*/

$(document).ready(function() {   

  var socket = io.connect();

  // $('#sender').bind('click', function() {
  //  socket.emit('message', 'Message Sent on ' + new Date());     
  // });

  socket.on('server_message', function(speed){
  	console.log(speed);
   	$('.speed h1').html(speed); 
  });
  
});