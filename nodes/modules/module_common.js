const fs = require('fs');
const spi = require('spi-device');

const BOOTMESSAGELENGTH = 46;
const SPISPEED = 2000000;

function ChecksumCalculator(array, length) {
	var pointer = 0;
	var checkSum = 0;
		for (pointer = 0; pointer<length; pointer++) {
			checkSum += array[pointer];
		}
	return (checkSum&255);	
}

function Module_Reset(state, moduleSlot){
	if(state === 1) {
		fs.writeFileSync('/sys/class/leds/ResetM-' + String(moduleSlot) + '/brightness','255');
	} else {
		fs.writeFileSync('/sys/class/leds/ResetM-' + String(moduleSlot) + '/brightness','0');
	}
}

function SendDummyByte(moduleSlot, init) {
	var sendBuffer = Buffer.alloc(5);
	var	receiveBuffer = Buffer.alloc(5);

	const dummyMessage = [{
		sendBuffer, 
		receiveBuffer,           
		byteLength : 5,
		speedHz: SPISPEED 
	}];

	var sL,sB;
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
	/*Send dummy message to setup the SPI bus properly */
	const dummy = spi.open(sL,sB, (err) => {
		
		/* Only in this scope, receive buffer is available */
		dummy.transfer(dummyMessage, (err, dummyMessage) => {
			dummy.close(err =>{});
			
			/* Here we start the reset routine */
			StartReset(moduleSlot, init);
		});

	});
}

function StartReset(moduleSlot, init){
	/*Start module reset */
	Module_Reset(1, moduleSlot);
	/*Give a certain timeout so module is reset properly*/
	resetTimeout = setTimeout(StopReset, 200, moduleSlot, init);
}

function StopReset (moduleSlot,init){
	Module_Reset(0, moduleSlot);	
	/*After reset, give the module some time to boot */
	/*Next step is to check for new available firmware */
	setTimeout(CancelFirmwareUpload, 200, moduleSlot, init);
}

function CancelFirmwareUpload(moduleSlot, init){
	var sendBuffer = Buffer.alloc(BOOTMESSAGELENGTH+1);
	var	receiveBuffer = Buffer.alloc(BOOTMESSAGELENGTH+1);
	
	const bootMessage = [{
		sendBuffer, 
		receiveBuffer,           
		byteLength: BOOTMESSAGELENGTH+1,
		speedHz: SPISPEED 
	}];

	var sL,sB;
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
	sendBuffer[0] = 19;
	sendBuffer[1] = BOOTMESSAGELENGTH-1; // Messagelength from bootloader
	sendBuffer[2] = 19;
	
	sendBuffer[BOOTMESSAGELENGTH-1] = ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);
	const cancel = spi.open(sL,sB, (err) => {
		cancel.transfer(bootMessage, (err, bootMessage) => {
			cancel.close(err =>{});
			/* At this point, The module can be initialized */
			setTimeout(init, 600, bootMessage[0].receiveBuffer);
		});
		
	});
}

module.exports.ChecksumCalculator = ChecksumCalculator;
module.exports.SendDummyByte = SendDummyByte;