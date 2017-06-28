'use strict';

var devices = require('../lib/card-reader');
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var http = require('http').createServer();
var io = require('socket.io')(http);
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');


var path = require('path');

var fs = require('fs'),
	sys = require('util'),
	exec = require('child_process').exec,
	child;
	
	
var port = 8000;
var SmartcardData = [];

// view engine setup
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '../public')));



app.get('/', function(req, res) {
	
	var ipaddress = require('child_process').execSync("ifconfig | grep inet | grep -v inet6 | awk '{gsub(/addr:/,\"\");print $2}'").toString().trim().split("\n");

    var devices = [
       { id: 1, topic: 'Sensor1', title: 'อุณหภูมิ',label:'Temperature'},
       { id: 2, topic: 'Sensor2', title: 'เข้า', label:'IN'},
       { id: 3, topic: 'Sensor3', title: 'ออก', label:'OUT'}
    ];
  
  	
	//var ipaddress = "192.168.1.36"; 
    res.render('index.ejs', {
        ipaddress: ipaddress[0],
        devices: devices
    });
    	

});


server.listen(port, function() {
    console.log('Listening Server port: ' + port);
}); 


http.listen(8081, function(){
  console.log('Listening Data port 8081');
 
});





io.sockets.on('connection', function(socket) {
			
	  setInterval(function(){

	  		socket.emit('List1',SmartcardData);
	  
	  }, 1000);
});



devices.on('device-activated', function (event) {
    console.log(`Device '${event.reader.name}' activated, devices: ${devices.listDevices()}`);
});

devices.on('device-deactivated', function (event) {
    console.log(`Device '${event.reader.name}' deactivated, devices: ${devices.listDevices()}`);
});

devices.on('card-removed', function (event) {
    console.log(`Card removed from '${event.reader.name}' `);
});

devices.on('command-issued', function (event) {
    //console.log(`Command '${event.command}' issued to '${event.reader.name}' `);
});

devices.on('response-received', function (event) {
    //console.log(`Response '${event.response}' received from '${event.reader.name}' in response to '${event.command}'`);
});

devices.on('error', function (event) {
    console.log(`Error '${event.error}' received`);
});

devices.on('card-inserted', function (event) {

    console.log(`List devices: ${devices.listDevices()}`);
    var reader = event.reader;
    console.log(`Card inserted into '${reader.name}' `);
	
	 
    devices
        .getInfo(reader)
        .then(function (response) {
            SmartcardData = response;
            console.log(SmartcardData);
        }).catch(function (error) {
            console.error(error);
        });
});
