module.exports = function(RED) {
"use strict"

const spi = require('spi-device');
const mod_common = require('./module_common');

/* Assigned dynamically */
const MESSAGELENGTH 	= 55;
const SPISPEED = 2000000;



function GOcontrollInputModule(config) { 	 
	RED.nodes.createNode(this,config);

	var interval = null;
	var node = this;
	var firmware;
	
	/* Get information from the Node configuration */
	const moduleSlot 		= parseInt(config.moduleSlot);
	const sampleTime 		= config.sampleTime;
	
	var supply	= [];
	supply[0] = config.supply1;
	supply[1] = config.supply2;
	supply[2] = config.supply3;
	
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
	pullUp[0] = config.pua1;
	pullUp[1] = config.pua2;
	pullUp[2] = config.pua3;
	pullUp[3] = config.pua4;
	pullUp[4] = config.pua5;
	pullUp[5] = config.pua6;
	
	var pullDown = [];
	pullDown[0] = config.pda1;
	pullDown[1] = config.pda2;
	pullDown[2] = config.pda3;
	pullDown[3] = config.pda4;
	pullDown[4] = config.pda5;
	pullDown[5] = config.pda6;

	var key	= [];
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
	mod_common.SendDummyByte(moduleSlot, InputModule_Initialize); 

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
		firmware = "HW:V"+bootloader_response[6]+bootloader_response[7]+bootloader_response[8]+bootloader_response[9] + "  SW:V"+bootloader_response[10]+"."+bootloader_response[11]+"."+bootloader_response[12];
		if (bootloader_response[6] == 20 && bootloader_response[7] ==  10 && bootloader_response[8] == 1) {

			node.status({fill:"green",shape:"dot",text:firmware});

			sendBuffer[0] = moduleSlot;
			sendBuffer[1] = MESSAGELENGTH-1;
			
			sendBuffer[2] = 1;
			sendBuffer[3] = 11;
			sendBuffer[4] = 2;
			sendBuffer[5] = 1;
		
			for(var messagePointer = 0; messagePointer < 6; messagePointer ++)
			{
				sendBuffer[(messagePointer+1)*6] = input[messagePointer];
				sendBuffer[((messagePointer+1)*6)+1] = (pullUp[messagePointer]&3)|((pullDown[messagePointer]&3)<<2)|((voltageRange[messagePointer]&3)<<6);
			}
			
			sendBuffer[42] = supply[0]; 
			sendBuffer[43] = supply[1]; 
			sendBuffer[44] = supply[2]; 
			
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
		sendBuffer[3] = 11;
		sendBuffer[4] = 3;
		sendBuffer[5] = 1;

		sendBuffer[MESSAGELENGTH-1] = mod_common.ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);

		getData.transfer(normalMessage, (err, normalMessage) => {
				if(receiveBuffer[MESSAGELENGTH-1] == mod_common.ChecksumCalculator(receiveBuffer, MESSAGELENGTH-1))
				{
					/*In case dat is received that holds module information */
					if(	receiveBuffer.readUInt8(2) === 2 	&& 
						receiveBuffer.readUInt8(3) === 11 	&&
						receiveBuffer.readUInt8(4) === 3 	&&
						receiveBuffer.readUInt8(5) === 1){
							
							for(var messagePointer = 0; messagePointer < 6; messagePointer ++)
							{
								msgOut[key[messagePointer]] = receiveBuffer.readInt32LE((messagePointer*8)+6)
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

RED.nodes.registerType("Input-Module",GOcontrollInputModule);
}
