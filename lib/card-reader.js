'use strict';

var events = require('events');
var pcsc = require('pcsclite');

var events = new events.EventEmitter();

var Iconv = require('iconv').Iconv //ADD
var iconv = new Iconv('CP874', 'UTF-8'); //ADD

var cmd_select = new Buffer([0x00, 0xA4, 0x04, 0x00, 0x08, 0xA0, 0x00, 0x00, 0x00, 0x54, 0x48, 0x00, 0x01]);
var cmd_reset = new Buffer([0x80, 0xb0, 0x00, 0x04, 0x02, 0x00, 0x0d]);
var cmd_idcard1 = new Buffer([0x80, 0xb0, 0x00, 0x04, 0x02, 0x00, 0x0d]);
var cmd_idcard2 = new Buffer([0x00, 0xc0, 0x00, 0x00, 0x0d]);
var cmd_fullname1 = new Buffer([0x80, 0xb0, 0x00, 0x11, 0x02, 0x00, 0xd1]);
var cmd_fullname2 = new Buffer([0x00, 0xc0, 0x00, 0x00, 0xd1]);
var cmd_address1 = new Buffer([0x80, 0xb0, 0x15, 0x79, 0x02, 0x00, 0x64]);
var cmd_address2 = new Buffer([0x00, 0xc0, 0x00, 0x00, 0x64]);
var cmd_expiredate1 = new Buffer([0x80, 0xb0, 0x01, 0x67, 0x02, 0x00, 0x12]);
var cmd_expiredate2 = new Buffer([0x00, 0xc0, 0x00, 0x00, 0x12]);

var idcard = "";
var fullnameTH = "";
var fullnameEN = "";
var birthday = "";
var address = "";						
var expiredate = "";

var smartcard = [];

let devices = {};


pcsc = pcsc(),


 
events.listDevices = () => {
  return Object.keys(devices);
};

events.fetchDevice = () => {
    return Object.keys(devices);
};


const cardInserted = (reader, status) => {
	
	//reader.connect({ share_mode : this.SCARD_SHARE_SHARED }, function(err, protocol) {
    reader.connect((err, protocol) => {
        if (err) {
            events.emit('error', err);
        } else {
            devices[reader.name] = { reader, protocol};
            events.emit('debug', `Device '${reader.name}' has protocol '${protocol}'`);
            events.emit('card-inserted', {reader, status, protocol});
        }
    });
};


const cardRemoved = (reader) => {
    reader.disconnect(reader.SCARD_LEAVE_CARD, (err) => {
        if (err) {
            events.emit('error', err);
        } else {
            devices[reader.name] = {};
            events.emit('card-removed', {reader});
        }
    });

};


const isCardInserted = (changes, reader, status) => {
    return (changes & reader.SCARD_STATE_PRESENT) && (status.state & reader.SCARD_STATE_PRESENT);
};


const isCardRemoved = (changes, reader, status) => {
    return (changes & reader.SCARD_STATE_EMPTY) && (status.state & reader.SCARD_STATE_EMPTY);
};


const deviceActivated = (reader) => {
    devices[reader.name] = {};
    events.emit('device-activated', {reader});

    reader.on('status', (status) => {
        var changes = reader.state ^ status.state;
        if (changes) {
            if (isCardRemoved(changes, reader, status)) {
                cardRemoved(reader);
            } else if (isCardInserted(changes, reader, status)) {
                cardInserted(reader, status);
            }
        }
    });

    reader.on('end', () => {
        delete devices[reader.name];
        events.emit('device-deactivated', {reader});
    });

    reader.on('error', (error) => {
        events.emit('error', {reader, error});
    });
};


pcsc.on('reader', (reader) => {
    deviceActivated(reader);
});


pcsc.on('error', (err) => {
    events.emit('error', {error});
});




events.getInfo = (reader,callback) => {

    const protocol = devices[reader.name].protocol;
    smartcard = [];

    events.emit('command-issued', {reader});
    
    if (callback) {
	    
			        reader.transmit(cmd_select, 0xFF, protocol, (err, response) => {});
				    reader.transmit(cmd_reset, 0xFF, protocol, (err, response) => {});    
				    reader.transmit(cmd_idcard1, 13, protocol, (err, response) => {});    
				    reader.transmit(cmd_idcard2, 13, protocol, (err, response) => {	                

						idcard = response.toString().substring(0,13);
						smartcard.push(idcard);

					});

				    reader.transmit(cmd_fullname1, 208, protocol, (err, response) => {});    
				    reader.transmit(cmd_fullname2, 208, protocol, (err, response) => {	                
						
						response = iconv.convert(response).toString('utf8');
						fullnameTH = response.toString().substring(0,97).trim().replace(/#/g, ' ');
						fullnameEN = response.toString().substring(97,197).trim().replace(/#/g, ' ');
						birthday = response.toString().substring(197,208).trim();
						
						smartcard.push(fullnameTH);
						smartcard.push(fullnameEN);
						smartcard.push(birthday);
						
					});

				    reader.transmit(cmd_address1, 100, protocol, (err, response) => {});    
				    reader.transmit(cmd_address2, 100, protocol, (err, response) => {	                
						
						response = iconv.convert(response).toString('utf8');
						address = response.toString().trim().replace(/#/g, ' ');
						
						smartcard.push(address);

					});
					
				    reader.transmit(cmd_expiredate1, 16, protocol, (err, response) => {});    
				    reader.transmit(cmd_expiredate2, 16, protocol, (err, response) => {	                
						
						response = iconv.convert(response).toString('utf8');
						expiredate = response.toString().trim().replace(/#/g, ' ');
						
						smartcard.push(expiredate);
					});
	                
			    
			            events.emit('response-received', {reader, smartcard});
			            callback(err, smartcard);		    
			        
	        

        
    } else {
        return new Promise((resolve, reject) => {
	        
            reader.transmit(cmd_select, 0xFF, protocol, (err, response) => {
	            
                if (err) reject(err);
                
                else {
                
			        reader.transmit(cmd_select, 0xFF, protocol, (err, response) => {});
				    reader.transmit(cmd_reset, 0xFF, protocol, (err, response) => {});    
				    reader.transmit(cmd_idcard1, 13, protocol, (err, response) => {});    
				    reader.transmit(cmd_idcard2, 13, protocol, (err, response) => {	                

						idcard = response.toString().substring(0,13);
						smartcard.push(idcard);

					});

				    reader.transmit(cmd_fullname1, 208, protocol, (err, response) => {});    
				    reader.transmit(cmd_fullname2, 208, protocol, (err, response) => {	                
						
						response = iconv.convert(response).toString('utf8');
						fullnameTH = response.toString().substring(0,97).trim().replace(/#/g, ' ');
						fullnameEN = response.toString().substring(97,197).trim().replace(/#/g, ' ');
						birthday = response.toString().substring(197,208).trim();

						smartcard.push(fullnameTH);
						smartcard.push(fullnameEN);
						smartcard.push(birthday);						
						
					});

				    reader.transmit(cmd_address1, 100, protocol, (err, response) => {});    
				    reader.transmit(cmd_address2, 100, protocol, (err, response) => {	                
						
						response = iconv.convert(response).toString('utf8');
						address = response.toString().trim().replace(/#/g, ' ');
						
						smartcard.push(address);

					});
					
				    reader.transmit(cmd_expiredate1, 16, protocol, (err, response) => {});    
				    reader.transmit(cmd_expiredate2, 16, protocol, (err, response) => {	                
						
						response = iconv.convert(response).toString('utf8');
						expiredate = response.toString().trim().replace(/#/g, ' ');
						
						smartcard.push(expiredate);
						
					});					
					
					
					
	
	                    events.emit('response-received', {reader, smartcard});
	                    resolve(smartcard);

					
                }
            });
        });
    }
};


module.exports = events;

