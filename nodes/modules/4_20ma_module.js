module.exports = function(RED) {
"use strict"

const spi = require('spi-device');
const mod_common = require('./module_common');

var MESSAGELENGTH 	= 33;
const SPISPEED = 2000000;



function GOcontroll4_20maModule(config) { 	 
	RED.nodes.createNode(this,config);

	var interval = null;
	var node = this;
	var firmware;

	/* Get information from the Node configuration */
	const moduleSlot 		= parseInt(config.moduleSlot);
	const sampleTime 		= config.sampleTime;

	var supply	={};
	supply[0] = config.supply1;
	supply[1] = config.supply2;
	supply[2] = config.supply3;
	supply[3] = config.supply4;
	supply[4] = config.supply5;

	var key	={};
	key[0] = config.key1;
	key[1] = config.key2;
	key[2] = config.key3;
	key[3] = config.key4;
	key[4] = config.key5;
	key[5] = config.key6;
	key[6] = config.key7;
	key[7] = config.key8;
	key[8] = config.key9;
	key[9] = config.key10;

	/*Allocate memory for receive and send buffer */
	var sendBuffer = Buffer.alloc(MESSAGELENGTH+5); 
	var	receiveBuffer = Buffer.alloc(MESSAGELENGTH+5);
	
	const normalMessage = [{
	sendBuffer, 
	receiveBuffer,           
	byteLength: MESSAGELENGTH+1,
	speedHz: SPISPEED 
	}];

	var spiReady = 0;

	var msgOut={};

	var sL, sB;

	/*Execute initialisation steps */
	/*Define the SPI port according the chosen module */
	switch(moduleSlot) {
		case 1: sL = 1; sB = 0;    break;
		case 2: sL = 1; sB = 1;    break;
		case 3: sL = 2; sB = 0;    break;
		case 4: sL = 2; sB = 1;    break;
		case 5: sL = 2; sB = 2;    break;
		case 6: sL = 2; sB = 3;    break;
		case 7: sL = 0; sB = 0;    break;
		case 8: sL = 0; sB = 1;    break;
	}

	/* Send dummy byte once so the master SPI is initialized properly */
	mod_common.PrepareForInit(moduleSlot, maModule_Initialize);

	/* open SPI device for continous communication */
	const getData = spi.open(sL,sB, (err) => {
		if(!err)
		{
		spiReady = true;
		} 
	});

	/***************************************************************************************
	** \brief
	**
	**
	** \param
	** \param
	** \return
	**
	****************************************************************************************/
	function maModule_Initialize (bootloader_response){
		firmware = mod_common.FormatFirmware(bootloader_response);
		if (bootloader_response[6] == 20 && bootloader_response[7] ==  10 && bootloader_response[8] == 3) {

			node.status({fill:"green",shape:"dot",text:firmware});

			sendBuffer[0] = moduleSlot;
			sendBuffer[1] = MESSAGELENGTH-1;

			sendBuffer[2] = 1;
			sendBuffer[3] = 13;
			sendBuffer[4] = 2;
			sendBuffer[5] = 1;

			sendBuffer[16] = supply[0];
			sendBuffer[17] = supply[1];
			sendBuffer[18] = supply[2];
			sendBuffer[19] = supply[3];
			sendBuffer[20] = supply[4];

			sendBuffer[MESSAGELENGTH-1] = mod_common.ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);

			const initialize = spi.open(sL,sB, (err) => {

				/* Only in this scope, receive buffer is available */
				initialize.transfer(normalMessage, (err, normalMessage) => {
					initialize.close(err =>{});
					interval = setInterval(maModule_GetData, parseInt(sampleTime));
				});
			});
		} else {
			node.status({fill:"red",shape:"dot",text:"Selected module does not match the module present in this slot."});
			node.warn("Detected incompatible firmware on slot " + moduleSlot + ": " + firmware);
		}
	}


	/***************************************************************************************
	** \brief
	**
	**
	** \param
	** \param
	** \return
	**
	****************************************************************************************/
	function maModule_GetData (){
		if(!spiReady) {
			return;
		}

		sendBuffer[0] = moduleSlot;
		sendBuffer[1] = MESSAGELENGTH-1;
	
		sendBuffer[2] = 1;
		sendBuffer[3] = 13;
		sendBuffer[4] = 3;
		sendBuffer[5] = 1;

		sendBuffer[MESSAGELENGTH-1] = mod_common.ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);

		getData.transfer(normalMessage, (err, normalMessage) => {
			if(receiveBuffer[MESSAGELENGTH-1] == mod_common.ChecksumCalculator(receiveBuffer, MESSAGELENGTH-1)) {
				
				/*In case dat is received that holds module information */
				if(	receiveBuffer.readUInt8(2) === 2 	&& 
					receiveBuffer.readUInt8(3) === 13 	&&
					receiveBuffer.readUInt8(4) === 3 	&&
					receiveBuffer.readUInt8(5) === 1){
						
					for(var messagePointer = 0; messagePointer < 10; messagePointer ++) {
						msgOut[key[messagePointer]] = receiveBuffer.readUint16LE((messagePointer*2)+6)
					}
					msgOut.status = {};
					var status = receiveBuffer.readUInt8(26);
					for (var idx = 1; idx  <= 5; idx ++) {
						msgOut.status["supply" + idx] = (status & (1 << (idx -1))) ? 1 : 0;
					}
					node.send(msgOut);
				}
			}					
		});	
	}


	/***************************************************************************************
	** \brief
	**
	**
	** \param
	** \param
	** \return
	**
	****************************************************************************************/
	node.on('input', function(msg) {

	});


	/***************************************************************************************
	** \brief
	**
	**
	** \param
	** \param
	** \return
	**
	****************************************************************************************/
	node.on('close', function(done) {
		clearInterval(interval);
		done();
	});
}
RED.nodes.registerType("4-20mA-Module",GOcontroll4_20maModule);
}
