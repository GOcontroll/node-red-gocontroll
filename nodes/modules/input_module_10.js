module.exports = function(RED) {
"use strict"

const spi = require('spi-device');
const mod_common = require('./module_common');

const MESSAGELENGTH 	= 50;
const SPISPEED = 2000000;

const VERSIONSECONDSUPPLY_10CHANNEL = 4;

function GOcontrollInputModule(config) { 	 
	RED.nodes.createNode(this,config);

	var interval = null;
	var node = this;
	var firmware;
	
	/* Get information from the Node configuration */
	const moduleSlot 		= parseInt(config.moduleSlot);
	const sampleTime 		= config.sampleTime;
	
	var supply1 = config.supply1;
	var supply2 = config.supply2;
	
	var input	= [];
	input[0] = config.input1;
	input[1] = config.input2;
	input[2] = config.input3;
	input[3] = config.input4;
	input[4] = config.input5;
	input[5] = config.input6;
	input[6] = config.input7;
	input[7] = config.input8;
	input[8] = config.input9;
	input[9] = config.input10;
	
	var voltageRange = [];
	voltageRange[0] = config.v1;
	voltageRange[1] = config.v2;
	voltageRange[2] = config.v3;
	voltageRange[3] = config.v4;
	voltageRange[4] = config.v5;
	voltageRange[5] = config.v6;
	
	var pullUp = [];
	pullUp[0] = config.pub1;
	pullUp[1] = config.pub2;
	pullUp[2] = config.pub3;
	pullUp[3] = config.pub4;
	pullUp[4] = config.pub5;
	pullUp[5] = config.pub6;
	pullUp[6] = config.pub7;
	pullUp[7] = config.pub8;
	pullUp[8] = config.pub9;
	pullUp[9] = config.pub10;
	
	var pullDown = [];
	pullDown[0] = config.pdb1;
	pullDown[1] = config.pdb2;
	pullDown[2] = config.pdb3;
	pullDown[3] = config.pdb4;
	pullDown[4] = config.pdb5;
	pullDown[5] = config.pdb6;
	pullDown[6] = config.pdb7;
	pullDown[7] = config.pdb8;
	pullDown[8] = config.pdb9;
	pullDown[9] = config.pdb10;

	var key	=[];
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
	
	var sL, sB;
	
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
	
	/*Execute initialisation steps */
	/*Define the SPI port according the chosen module */
	switch(moduleSlot)
	{
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
	mod_common.PrepareForInit(moduleSlot, InputModule_Initialize); 

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
	function InputModule_Initialize (bootloader_response){
		firmware = mod_common.FormatFirmware(bootloader_response);
		if (bootloader_response[6] == 20 && bootloader_response[7] ==  10 && bootloader_response[8] == 2) {
			const sw_version = (bootloader_response[10] << 16) + (bootloader_response[11] << 8) + bootloader_response[12];

			node.status({fill:"green",shape:"dot",text:firmware});

			sendBuffer[0] = moduleSlot;
			sendBuffer[1] = MESSAGELENGTH-1;
			
			sendBuffer[2] = 1;
			sendBuffer[3] = 12;
			sendBuffer[4] = 2;
			sendBuffer[5] = 1;
			for(var messagePointer = 0; messagePointer < 10; messagePointer ++)
			{
				sendBuffer[(messagePointer*4)+6] = input[messagePointer];
				sendBuffer[((messagePointer*4)+7)] = (pullUp[messagePointer]&3)|((pullDown[messagePointer]&3)<<2);
			}

			sendBuffer[46] = supply1;
			if (sw_version >= VERSIONSECONDSUPPLY_10CHANNEL) {
				sendBuffer[47] = supply2;
			}
			sendBuffer[MESSAGELENGTH-1] = mod_common.ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);

			const initialize = spi.open(sL,sB, (err) => {
				/* Only in this scope, receive buffer is available */
				initialize.transfer(normalMessage, (err, normalMessage) => {
					initialize.close(err =>{});
					interval = setInterval(InputModule_GetData, parseInt(sampleTime));
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
	function InputModule_GetData (){	
		if(!spiReady){
			return;
		}

		sendBuffer[0] = moduleSlot;
		sendBuffer[1] = MESSAGELENGTH-1;
		
		sendBuffer[2] = 1;
		sendBuffer[3] = 12;
		sendBuffer[4] = 3;
		sendBuffer[5] = 1;

		sendBuffer[MESSAGELENGTH-1] = mod_common.ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);

		getData.transfer(normalMessage, (err, normalMessage) => {
			if(receiveBuffer[MESSAGELENGTH-1] == mod_common.ChecksumCalculator(receiveBuffer, MESSAGELENGTH-1))
			{
				/*In case dat is received that holds module information */
				if(	receiveBuffer.readUInt8(2) === 2 	&& 
					receiveBuffer.readUInt8(3) === 12 	&&
					receiveBuffer.readUInt8(4) === 3 	&&
					receiveBuffer.readUInt8(5) === 1){
										
					for(var messagePointer = 0; messagePointer < 10; messagePointer ++)
					{
						msgOut[key[messagePointer]] = receiveBuffer.readInt32LE((messagePointer*4)+6)
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
		for (var i = 0; i < 5; i++) {
			var pulses = msg["channel" + (i*2 + 1)+ "_" + (i*2 + 2) + "pulses"];
			if (pulses !== undefined) {
				if(pulses >= -2147483640 && pulses <= 2147483640) {
					var sendBuffer = Buffer.alloc(MESSAGELENGTH+5); 
					var	receiveBuffer = Buffer.alloc(MESSAGELENGTH+5);

					sendBuffer[0] = moduleSlot;
					sendBuffer[1] = MESSAGELENGTH-1;
					sendBuffer[2] = 1;
					sendBuffer[3] = 12;
					sendBuffer[4] = 3;
					sendBuffer[5] = 2;
					sendBuffer[6] = (i*2 + 1);
					sendBuffer.writeInt32LE(pulses, 7);

					sendBuffer[MESSAGELENGTH-1] = mod_common.ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);

					const inputModuleReset = spi.open(sL,sB, (err) => {

						const message = [{
							sendBuffer, 
							receiveBuffer,           
							byteLength: MESSAGELENGTH+1,
							speedHz: SPISPEED 
						}];
						inputModuleReset.transfer(message, (err, message) => {
							inputModuleReset.close(err =>{});
						});
					});
				} else {
					node.warn("Invalid counter value received, should be in the range of a signed 32 bit integer"); 
				}
			}
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
	node.on('close', function(done) {
		clearInterval(interval);
		done();
	});
}

RED.nodes.registerType("Input-Module-10",GOcontrollInputModule);
}
