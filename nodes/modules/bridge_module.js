module.exports = function(RED) {
    "use strict"

	const spi = require('spi-device');
	const mod_common = require('./module_common');
	
	const MESSAGELENGTH = 44;
	const SPISPEED = 2000000;
	
	function GOcontrollBridgeModule(config) {	 
	   RED.nodes.createNode(this,config);
	   
	   	var interval = null;
		var node = this;
		var firmware;
		
		const moduleSlot = config.moduleSlot; 
		const sampleTime = config.sampleTime;
	
		var outputType = {};
		outputType[0] = config.output1;
		outputType[1] = config.output2;

		
		var outputFreq = {};
		outputFreq[0] = config.freq12;
		outputFreq[1] = config.freq12;

		
		var outputCurrent = {};
		outputCurrent[0] = 4000;//config.current1;
		outputCurrent[1] = 4000;//config.current2;

		
		var key={};
		key[0] = config.key1;
		key[1] = config.key2;
		
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
		switch(moduleSlot)
		{
			case "1": sL = 1; sB = 0;    break;
			case "2": sL = 1; sB = 1;    break;
			case "3": sL = 2; sB = 0;    break;
			case "4": sL = 2; sB = 1;    break;
			case "5": sL = 2; sB = 2;    break;
			case "6": sL = 2; sB = 3;    break;
			case "7": sL = 0; sB = 0;    break;
			case "8": sL = 0; sB = 1;    break;
		}

		/* Send dummy byte once so the master SPI is initialized properly */
		mod_common.SendDummyByte(moduleSlot, BridgeModule_Initialize); 
	
		
		/* open SPI device for continous communication */
		const getData = spi.open(sL,sB, (err) => {
			if(!err)
			{
			spiReady = true;
			} 
		});

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
		function BridgeModule_Initialize(bootloader_response){
			firmware = "HW:V"+bootloader_response[6]+bootloader_response[7]+bootloader_response[8]+bootloader_response[9] + "  SW:V"+bootloader_response[10]+"."+bootloader_response[11]+"."+bootloader_response[12];
			if (bootloader_response[6] == 20 && bootloader_response[7] ==  20 && bootloader_response[8] == 1) {

				node.status({fill:"green",shape:"dot",text:firmware});

				sendBuffer[0] = 1;
				sendBuffer[1] = MESSAGELENGTH-1;
				sendBuffer.writeUInt16LE(301,2);
				
				for(var s =0; s <2; s++) {
					sendBuffer[6+s] = (outputFreq[s]&15)|((outputType[s]&15)<<4);
					sendBuffer.writeUInt16LE(outputCurrent[s], 12+(s*2));
				}
								
				sendBuffer[MESSAGELENGTH-1] = mod_common.ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);
				
				const bridgeModule = spi.open(sL,sB, (err) => {

					/* Only in this scope, receive buffer is available */
					bridgeModule.transfer(normalMessage, (err, normalMessage) => {
						bridgeModule.close(err=>{});
						BridgeModule_clearBuffer();
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
		function BridgeModule_clearBuffer(){	
		
			sendBuffer[0] = 1;
			sendBuffer[1] = MESSAGELENGTH-1;
			sendBuffer.writeUInt16LE(302,2);
				
				for(var s = 4; s <MESSAGELENGTH; s++)
				{
					sendBuffer[s] = 0;		   	
				}
					
			sendBuffer[MESSAGELENGTH-1] = mod_common.ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);	
			node.status({fill:"green",shape:"dot",text:firmware})
			/* Start interval to get module data */
			interval = setInterval(BridgeModule_SendAndGetModuleData, parseInt(sampleTime));		
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
		function BridgeModule_SendAndGetModuleData (){
			
			if(!spiReady)
			{
				return;
			}		
			getData.transfer(normalMessage, (err, normalMessage) => {
					
				if(receiveBuffer[MESSAGELENGTH-1] === mod_common.ChecksumCalculator(receiveBuffer, MESSAGELENGTH-1))
				{
					/*In case dat is received that holds module information */
					if(receiveBuffer.readUInt16LE(2) === 303)
					{	
						msgOut["moduleTemperature"] = receiveBuffer.readInt16LE(6),
						msgOut["moduleGroundShift"] = receiveBuffer.readUInt16LE(8),
						msgOut[key[0]+"Current"]= receiveBuffer.readInt16LE(10),
						msgOut[key[1]+"Current"]= receiveBuffer.readInt16LE(12),
							
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
			
			sendBuffer[0] = 1;
			sendBuffer[1] = MESSAGELENGTH-1;
			sendBuffer.writeUInt16LE(302,2);
		
			
			for(var s =0; s <2; s++)
			{
			   if(msg[key[s]] <= 1000 && msg[key[s]] >= 0)
			   {
				sendBuffer.writeUInt16LE(msg[key[s]], (s*6)+6);
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
RED.nodes.registerType("Bridge-Module",GOcontrollBridgeModule);
}