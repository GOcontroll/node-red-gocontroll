module.exports = function(RED) {
    "use strict"

	const spi = require('spi-device');
	const mod_common = require('./module_common');

	/* Assigned dynamically */
	var MESSAGELENGTH 	= 49;
	const SPISPEED = 2000000;

	function GOcontrollOutputModule(config) {	 
	   RED.nodes.createNode(this,config);

	   	var interval = null;
		var node = this;
		var firmware;

		const moduleSlot = parseInt(config.moduleSlot);
		const sampleTime = config.sampleTime;

		var outputType = [];
		outputType[0] = config.output1;
		outputType[1] = config.output2;
		outputType[2] = config.output3;
		outputType[3] = config.output4;
		outputType[4] = config.output5;
		outputType[5] = config.output6;
		outputType[6] = config.output7;
		outputType[7] = config.output8;
		outputType[8] = config.output9;
		outputType[9] = config.output10;

		var outputFreq = [];
		outputFreq[0] = config.freq12;
		outputFreq[1] = config.freq12;
		outputFreq[2] = config.freq34;
		outputFreq[3] = config.freq34;
		outputFreq[4] = config.freq56;
		outputFreq[5] = config.freq56;
		outputFreq[6] = config.freq78;
		outputFreq[7] = config.freq78;
		outputFreq[8] = config.freq910;
		outputFreq[9] = config.freq910;

		var key=[];
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
		mod_common.PrepareForInit(moduleSlot, OutputModule_Initialize); 

		/* open SPI device for continous communication */
		const getData = spi.open(sL,sB, (err) => {
			if(!err)
			{
			spiReady = true;
			} 
		});

		/***************************************************************************************
		** \brief 	First initialisation message that is send to the output module
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		function OutputModule_Initialize(bootloader_response) {
			firmware = mod_common.FormatFirmware(bootloader_response);

			if (bootloader_response[6] == 20 && bootloader_response[7] ==  20 && bootloader_response[8] == 3) {

				node.status({fill:"green",shape:"dot",text:firmware});

				sendBuffer[0] = moduleSlot;
				sendBuffer[1] = MESSAGELENGTH-1;

				sendBuffer[2] = 1;
				sendBuffer[3] = 23;
				sendBuffer[4] = 2;
				sendBuffer[5] = 1;

				for(var s =0; s <10; s++) {
					sendBuffer[6+s] = (outputFreq[s]&15)|((outputType[s]&15)<<4);
				}

				sendBuffer[MESSAGELENGTH-1] = mod_common.ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);

				const outputModule = spi.open(sL,sB, (err) => {

					/* Only in this scope, receive buffer is available */
					outputModule.transfer(normalMessage, (err, normalMessage) => {
						outputModule.close(err =>{});
						OutputModule_clearBuffer();
					// setTimeout(OutputModule_Initialize_Second, 100);
					});
				});
			} else {
				node.status({fill:"red",shape:"dot",text:"Selected module does not match the module present in this slot."});
				node.warn("Detected incompatible firmware on slot " + moduleSlot + ": " + firmware);
			}
		}

		/***************************************************************************************
		** \brief 	Cleanup sendbuffer for next messages otherwise it may be possible that the output
		**			values are directly set
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		function OutputModule_clearBuffer(){

			sendBuffer[0] = moduleSlot;
			sendBuffer[1] = MESSAGELENGTH-1;

			sendBuffer[2] = 1;
			sendBuffer[3] = 23;
			sendBuffer[4] = 3;
			sendBuffer[5] = 1;

			for(var s = 3; s <MESSAGELENGTH; s++)
			{
				sendBuffer[s] = 0;
			}

			sendBuffer[MESSAGELENGTH-1] = mod_common.ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);	
			node.status({fill:"green",shape:"dot",text:firmware})
			/* Start interval to get module data */
			interval = setInterval(OutputModule_SendAndGetModuleData, parseInt(sampleTime));		
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
		function OutputModule_SendAndGetModuleData (){

			if(!spiReady)
			{
				return;
			}
				  getData.transfer(normalMessage, (err, normalMessage) => {
					  
					if(receiveBuffer[MESSAGELENGTH-1] === mod_common.ChecksumCalculator(receiveBuffer, MESSAGELENGTH-1))
					{			
						if(	receiveBuffer.readUInt8(2) === 2 	&& 
							receiveBuffer.readUInt8(3) === 23 	&&
							receiveBuffer.readUInt8(4) === 4 	&&
							receiveBuffer.readUInt8(5) === 1){
										
							msgOut["moduleTemperature"] = receiveBuffer.readInt16LE(6),
							msgOut["moduleGroundShift"] = receiveBuffer.readUInt16LE(8),
							msgOut["moduleVoltage"] = receiveBuffer.readInt16LE(10),
							msgOut["moduleCurrent"] = receiveBuffer.readUInt16LE(12),
							msgOut["moduleStatus"] = receiveBuffer.readUInt32LE(22),
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
			
			sendBuffer[0] = moduleSlot;
			sendBuffer[1] = MESSAGELENGTH-1;

			sendBuffer[2] = 1;
			sendBuffer[3] = 23;
			sendBuffer[4] = 3;
			sendBuffer[5] = 1;

			for(var s =0; s <10; s++)
			{
				if(msg[key[s]] <= 1000 && msg[key[s]] >= 0)
				{
				sendBuffer.writeUInt16LE(msg[key[s]], (s*2)+6);
				}
			}

			sendBuffer[MESSAGELENGTH-1] = mod_common.ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);
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
RED.nodes.registerType("Output-Module-10",GOcontrollOutputModule);
}