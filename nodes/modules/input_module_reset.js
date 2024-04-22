module.exports = function(RED) {
    "use strict"
	
	const spi = require('spi-device');
	const mod_common = require('./module_common');
	
	var MESSAGELENGTH = 0;
	const SPISPEED = 2000000;
	
	function GOcontrollInputModuleReset(config) { 	 
	   RED.nodes.createNode(this,config);
	   
	   /* Get information from the Node configuration */
		const moduleSlot 	= parseInt(config.moduleSlot);
		const moduleType	= config.moduleType; 
		const channel6 		= config.channel6;
		const channel10 	= config.channel10;
        var node 			= this;
		
		var channel; 
		var sL, sB;
		var allowed = false;
		
		/* Assign information according module type */
		/* In case 6 channel input module is selected */
		if(moduleType == 1){
			MESSAGELENGTH 	= 55;
		/* In case 10 channel input module is selected */
		}else{
			MESSAGELENGTH 	= 50;
		}
		
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

		try {
			const data = fs.readFileSync('/usr/module-firmware/modules.txt', 'utf8');
			modulesArr = data.split(":");
			var moduleArr = modulesArr[moduleSlot-1].split("-");
			if (moduleArr.length != 7) {
				node.status({fill:"red",shape:"dot",text:"No module is registered in slot " + moduleSlot + ". You might have to run go-scan-modules"});
				return;
			}
			if (moduleArr[2].length==1) {
				moduleArr[2] = "0" + moduleArr[2];
			}
			if (moduleArr[3].length==1) {
				moduleArr[3] = "0" + moduleArr[3];
			}
			firmware = "HW:V"+moduleArr[0]+moduleArr[1]+moduleArr[2]+moduleArr[3] + "  SW:V"+moduleArr[4]+"."+moduleArr[5]+"."+moduleArr[6];
			/*check if the selected module is okay for this slot*/
			/*6 channel input*/
			if((moduleType == 1 && firmware.includes("201001")) || (moduleType == 0 && firmware.includes("201002"))){
				node.status({fill:"green",shape:"dot",text:firmware});
				allowed = true;
			} else {
				node.status({fill:"red",shape:"dot",text:"Selected module does not match the firmware registered in this slot."});
			}
		} catch (err) {
			node.status({fill:"red",shape:"dot",text:"Some error occured checking the module, see the debug messages"});
			node.warn("No module has been registered in slot " + moduleSlot + ", the module(s) configured for this slot will not work. If a module has been recently inserted in this slot, run go-scan-modules to register it.");
		}
		
		/***execution initiated by event *******/
		node.on('input', function(msg) {
			if (allowed) {
				var sendBuffer = Buffer.alloc(MESSAGELENGTH+5); 
				var	receiveBuffer = Buffer.alloc(MESSAGELENGTH+5);
			
				sendBuffer[0] = moduleSlot;
				sendBuffer[1] = MESSAGELENGTH-1;
				sendBuffer[2] = 1;
				
				if(moduleType == 1) { /* In case 6 channel module is selected */
					sendBuffer[3] = 11;
					sendBuffer[6] = channel6;
					channel = channel6;
				} else { /* In case 10 channel module is selected */
					sendBuffer[3] = 12;
					sendBuffer[6] = channel10;
					channel = channel10;
				}
				
				sendBuffer[4] = 3;
				sendBuffer[5] = 2;
				
				if(msg["pulsecounterValue"] >= -2147483640 && msg["pulsecounterValue"] <= 2147483640) {
					sendBuffer.writeInt32LE(msg["pulsecounterValue"], 7);	
				}
				else{
					node.warn("Reset counter value of module "+ String(moduleSlot) + "channel "+ String(channel) +" is outside range."); 
					return;
				}
				
				sendBuffer[MESSAGELENGTH-1] = mod_common.ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);
				
				const inputModuleReset = spi.open(sL,sB, (err) => {

					const message = [{
						sendBuffer, 
						receiveBuffer,           
						byteLength: MESSAGELENGTH+1,
						speedHz: SPISPEED 
					}];
					inputModuleReset.transfer(message, (err, message) => {
					});
				});
			}
		});
	}
	RED.nodes.registerType("Input-Module-Reset",GOcontrollInputModuleReset);
}