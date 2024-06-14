module.exports = function(RED) {
    "use strict"

	const spi = require('spi-device');
	const mod_common = require('./module_common');

	/* Assigned dynamically */
	const MESSAGELENGTH 	= 44;
	const SPISPEED = 2000000;

	
	function GOcontrollOutputModule(config) {	 
	   RED.nodes.createNode(this,config);
	   
	   	var interval = null;
		var node = this;
		var firmware;
		var hw_version;
		
		
		const moduleSlot = parseInt(config.moduleSlot);
		const moduleType = config.moduleType; 
		const sampleTime = config.sampleTime;
	
		var outputType = [];
		outputType[0] = config.output1;
		outputType[1] = config.output2;
		outputType[2] = config.output3;
		outputType[3] = config.output4;
		outputType[4] = config.output5;
		outputType[5] = config.output6;
		
		var outputFreq = [];
		outputFreq[0] = config.freq12;
		outputFreq[1] = config.freq12;
		outputFreq[2] = config.freq34;
		outputFreq[3] = config.freq34;
		outputFreq[4] = config.freq56;
		outputFreq[5] = config.freq56;
		
		var outputCurrent = [];
		outputCurrent[0] = config.current1;
		outputCurrent[1] = config.current2;
		outputCurrent[2] = config.current3;
		outputCurrent[3] = config.current4;
		outputCurrent[4] = config.current5;
		outputCurrent[5] = config.current6;
		
		var peakcurrent = [];
		peakcurrent[0] = config.peakcurrent1;
		peakcurrent[1] = config.peakcurrent2;
		peakcurrent[2] = config.peakcurrent3;
		peakcurrent[3] = config.peakcurrent4;
		peakcurrent[4] = config.peakcurrent5;
		peakcurrent[5] = config.peakcurrent6;
		
		var outputTime = [];
		outputTime[0] = config.time1;
		outputTime[1] = config.time2;
		outputTime[2] = config.time3;
		outputTime[3] = config.time4;
		outputTime[4] = config.time5;
		outputTime[5] = config.time6;
		
		var key=[];
		key[0] = config.key1;
		key[1] = config.key2;
		key[2] = config.key3;
		key[3] = config.key4;
		key[4] = config.key5;
		key[5] = config.key6;
		
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
			if (bootloader_response[6] == 20 && bootloader_response[7] ==  20 && bootloader_response[8] == 2) {

				node.status({fill:"green",shape:"dot",text:firmware});

				hw_version = bootloader_response[9];

				sendBuffer[0] = moduleSlot;
				sendBuffer[1] = MESSAGELENGTH-1;
				
				sendBuffer[2] = 1;
				sendBuffer[3] = 22;
				sendBuffer[4] = 2;
				sendBuffer[5] = 1;
				for(var s =0; s <6; s++) {
					sendBuffer[6+s] = (outputFreq[s]&15)|((outputType[s]&15)<<4);
					sendBuffer.writeUInt16LE(outputCurrent[s], 12+(s*2));
				}
				
					
				sendBuffer[MESSAGELENGTH-1] = mod_common.ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);
				
				const outputModule = spi.open(sL,sB, (err) => {

					/* Only in this scope, receive buffer is available */
					outputModule.transfer(normalMessage, (err, normalMessage) => {
						outputModule.close(err =>{});
						setTimeout(OutputModule_Initialize_Second, 100);	
					});
				});
			} else {
				node.status({fill:"red",shape:"dot",text:"Selected module does not match the module present in this slot."});
				node.warn("Detected incompatible firmware on slot " + moduleSlot + ": " + firmware);
			}
		}
		
		
		/***************************************************************************************
		** \brief 	Second initialisation message that is send to the output module
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		function OutputModule_Initialize_Second() {

		sendBuffer[0] = moduleSlot;
		sendBuffer[1] = MESSAGELENGTH-1;

		sendBuffer[2] = 1;
		sendBuffer[3] = 22;
		sendBuffer[4] = 2;
		sendBuffer[5] = 2;
			
		for(var s =0; s <6; s++)
		{
			sendBuffer.writeUInt16LE(peakcurrent[s], 6+(s*2));
			sendBuffer.writeUInt16LE(outputTime[s], 18+(s*2));
		}
						
		sendBuffer[MESSAGELENGTH-1] = mod_common.ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);
			
			const outputModule = spi.open(sL,sB, (err) => {

				/* Only in this scope, receive buffer is available */
				outputModule.transfer(normalMessage, (err, normalMessage) => {
					outputModule.close(err =>{});
					OutputModule_clearBuffer();
				});
			});	
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
		sendBuffer[3] = 22;
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
					/*In case dat is received that holds module information */
					if(		receiveBuffer.readUInt8(2) === 2 	&& 
							receiveBuffer.readUInt8(3) === 22 	&&
							receiveBuffer.readUInt8(4) === 4 	&&
							receiveBuffer.readUInt8(5) === 1){
									
						msgOut["moduleTemperature"] = receiveBuffer.readInt16LE(6);
						msgOut["moduleGroundShift"] = receiveBuffer.readUInt16LE(8);
						msgOut["moduleStatus"] = receiveBuffer.readUInt32LE(22);
						if (hw_version >= 7) {
							msgOut["moduleSupply"] = receiveBuffer.readUInt16LE(41);
						}
						msgOut[key[0]+"Current"]= receiveBuffer.readInt16LE(10);
						msgOut[key[1]+"Current"]= receiveBuffer.readInt16LE(12);
						msgOut[key[2]+"Current"]= receiveBuffer.readInt16LE(14);
						msgOut[key[3]+"Current"]= receiveBuffer.readInt16LE(16);
						msgOut[key[4]+"Current"]= receiveBuffer.readInt16LE(18);
						msgOut[key[5]+"Current"]= receiveBuffer.readInt16LE(20);
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
			sendBuffer[3] = 22;
			sendBuffer[4] = 3;
			sendBuffer[5] = 1;

			for(var s =0; s <6; s++)
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
RED.nodes.registerType("Output-Module",GOcontrollOutputModule);
}
