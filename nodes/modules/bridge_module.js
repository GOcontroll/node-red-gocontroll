module.exports = function (RED) {
	"use strict"

	const spi = require('spi-device');
	const mod_common = require('./module_common');

	const MESSAGELENGTH = 44;
	const SPISPEED = 2000000;

	/* Module type byte of the 2 channel power bridge module in the SPI protocol */
	const BRIDGEMODULE = 21;

	/* Maximum current of one individual channel in mA. Matches MAXCURRENTCHANNELNOMINAL
	 * in the module firmware. The module uses this value when 0 is provided. */
	const CURRENTMAX = 10000;

	/* The byte oriented SPI protocol is only spoken by module firmware 2.0.0 and higher */
	const MINIMUMFIRMWAREMAJOR = 2;

	function GOcontrollBridgeModule(config) {
		RED.nodes.createNode(this, config);

		var interval = null;
		var node = this;
		var firmware;

		const moduleSlot = parseInt(config.moduleSlot);
		const sampleTime = config.sampleTime;
		const objectOutput = (config.objectOutput !== false);

		/* Older flows do not hold the properties that were added together with the byte
		 * oriented protocol, so fall back to a sane default when they are missing. */
		function toNumber(value, fallback) {
			const number = parseInt(value);
			return Number.isFinite(number) ? number : fallback;
		}

		var outputType = [];
		outputType[0] = toNumber(config.output1, 1);
		outputType[1] = toNumber(config.output2, 1);

		var outputFreq = [];
		outputFreq[0] = toNumber(config.freq12, 1);
		outputFreq[1] = toNumber(config.freq12, 1);

		var outputCurrent = [];
		outputCurrent[0] = toNumber(config.current1, CURRENTMAX);
		outputCurrent[1] = toNumber(config.current2, CURRENTMAX);

		var peakcurrent = [];
		peakcurrent[0] = toNumber(config.peakcurrent1, 800);
		peakcurrent[1] = toNumber(config.peakcurrent2, 800);

		var outputTime = [];
		outputTime[0] = toNumber(config.time1, 500);
		outputTime[1] = toNumber(config.time2, 500);

		var key = [];
		key[0] = config.key1;
		key[1] = config.key2;

		/*Allocate memory for receive and send buffer */
		var sendBuffer = Buffer.alloc(MESSAGELENGTH + 5);
		var receiveBuffer = Buffer.alloc(MESSAGELENGTH + 5);

		const normalMessage = [{
			sendBuffer,
			receiveBuffer,
			byteLength: MESSAGELENGTH + 1,
			speedHz: SPISPEED
		}];

		var spiReady = 0;

		var msgOut = {};

		var sL, sB;

		/*Execute initialisation steps */
		/*Define the SPI port according the chosen module */
		switch (moduleSlot) {
			case 1: sL = 1; sB = 0; break;
			case 2: sL = 1; sB = 1; break;
			case 3: sL = 2; sB = 0; break;
			case 4: sL = 2; sB = 1; break;
			case 5: sL = 2; sB = 2; break;
			case 6: sL = 2; sB = 3; break;
			case 7: sL = 0; sB = 0; break;
			case 8: sL = 0; sB = 1; break;
		}

		/* Send dummy byte once so the master SPI is initialized properly */
		mod_common.PrepareForInit(moduleSlot, BridgeModule_Initialize);


		/* open SPI device for continous communication */
		const getData = spi.open(sL, sB, (err) => {
			if (!err) {
				spiReady = true;
			}
		});

		/***************************************************************************************
		** \brief 	First initialisation message that is send to the bridge module
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		function BridgeModule_Initialize(bootloader_response) {
			firmware = mod_common.FormatFirmware(bootloader_response);
			if (bootloader_response[6] == 20 && bootloader_response[7] == 20 && bootloader_response[8] == 1) {

				if (bootloader_response[10] < MINIMUMFIRMWAREMAJOR) {
					node.status({ fill: "red", shape: "dot", text: "Module firmware too old, update to V" + MINIMUMFIRMWAREMAJOR + ".0.0 or higher." });
					node.warn("Bridge module on slot " + moduleSlot + " runs " + firmware +
						". This node requires module firmware V" + MINIMUMFIRMWAREMAJOR + ".0.0 or higher.");
					return;
				}

				node.status({ fill: "green", shape: "dot", text: firmware });

				sendBuffer[0] = moduleSlot;
				sendBuffer[1] = MESSAGELENGTH - 1;

				sendBuffer[2] = 1;
				sendBuffer[3] = BRIDGEMODULE;
				sendBuffer[4] = 2;
				sendBuffer[5] = 1;

				for (var s = 0; s < 2; s++) {
					sendBuffer[6 + s] = (outputFreq[s] & 15) | ((outputType[s] & 15) << 4);
					sendBuffer.writeUInt16LE(outputCurrent[s], 12 + (s * 2));
				}

				sendBuffer[MESSAGELENGTH - 1] = mod_common.ChecksumCalculator(sendBuffer, MESSAGELENGTH - 1);

				const bridgeModule = spi.open(sL, sB, (err) => {

					/* Only in this scope, receive buffer is available */
					bridgeModule.transfer(normalMessage, (err, normalMessage) => {
						bridgeModule.close(err => { });
						setTimeout(BridgeModule_Initialize_Second, 100);
					});
				});
			} else {
				node.status({ fill: "red", shape: "dot", text: "Selected module does not match the module present in this slot." });
				node.warn("Detected incompatible firmware on slot " + moduleSlot + ": " + firmware);
			}
		}


		/***************************************************************************************
		** \brief 	Second initialisation message that holds the peak and hold parameters
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		function BridgeModule_Initialize_Second() {

			sendBuffer[0] = moduleSlot;
			sendBuffer[1] = MESSAGELENGTH - 1;

			sendBuffer[2] = 1;
			sendBuffer[3] = BRIDGEMODULE;
			sendBuffer[4] = 2;
			sendBuffer[5] = 2;

			for (var s = 0; s < 2; s++) {
				sendBuffer.writeUInt16LE(peakcurrent[s], 6 + (s * 2));
				sendBuffer.writeUInt16LE(outputTime[s], 18 + (s * 2));
			}

			sendBuffer[MESSAGELENGTH - 1] = mod_common.ChecksumCalculator(sendBuffer, MESSAGELENGTH - 1);

			const bridgeModule = spi.open(sL, sB, (err) => {

				/* Only in this scope, receive buffer is available */
				bridgeModule.transfer(normalMessage, (err, normalMessage) => {
					bridgeModule.close(err => { });
					BridgeModule_clearBuffer();
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
		function BridgeModule_clearBuffer() {

			sendBuffer[0] = moduleSlot;
			sendBuffer[1] = MESSAGELENGTH - 1;

			sendBuffer[2] = 1;
			sendBuffer[3] = BRIDGEMODULE;
			sendBuffer[4] = 3;
			sendBuffer[5] = 1;

			/* Only clear the payload, the header bytes above must stay intact */
			for (var s = 6; s < MESSAGELENGTH; s++) {
				sendBuffer[s] = 0;
			}

			sendBuffer[MESSAGELENGTH - 1] = mod_common.ChecksumCalculator(sendBuffer, MESSAGELENGTH - 1);
			node.status({ fill: "green", shape: "dot", text: firmware })
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
		function BridgeModule_SendAndGetModuleData() {

			if (!spiReady) {
				return;
			}
			getData.transfer(normalMessage, (err, normalMessage) => {

				if (receiveBuffer[MESSAGELENGTH - 1] === mod_common.ChecksumCalculator(receiveBuffer, MESSAGELENGTH - 1)) {
					/*In case dat is received that holds module information */
					if (receiveBuffer.readUInt8(2) === 2 &&
						receiveBuffer.readUInt8(3) === BRIDGEMODULE &&
						receiveBuffer.readUInt8(4) === 4 &&
						receiveBuffer.readUInt8(5) === 1) {

						msgOut["moduleTemperature"] = receiveBuffer.readInt16LE(6);
						msgOut["moduleGroundShift"] = receiveBuffer.readInt16LE(8);
						msgOut["moduleStatus"] = receiveBuffer.readUInt32LE(22);
						msgOut["moduleSupply"] = receiveBuffer.readUInt16LE(41);
						msgOut[key[0] + "Current"] = receiveBuffer.readInt16LE(10);
						msgOut[key[1] + "Current"] = receiveBuffer.readInt16LE(12);
						for (var i = 0; i < 2; i++) {
							if (outputType[i] == 7) { //output is peak and hold ie current control
								msgOut[key[i] + "DutyCycle"] = receiveBuffer.readUInt16LE(26 + i * 2);
							}
						}

						if (objectOutput) {
							node.send(msgOut);
						} else {
							node.send({payload: msgOut});
						}
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
		node.on('input', function (msg) {
			var src = objectOutput ? msg : (msg.payload || {});

			sendBuffer[0] = moduleSlot;
			sendBuffer[1] = MESSAGELENGTH - 1;

			sendBuffer[2] = 1;
			sendBuffer[3] = BRIDGEMODULE;
			sendBuffer[4] = 3;
			sendBuffer[5] = 1;

			for (var s = 0; s < 2; s++) {
				if (src[key[s]] <= 1000 && src[key[s]] >= 0) {
					sendBuffer.writeUInt16LE(src[key[s]], (s * 6) + 6);
				}
			}

			sendBuffer[MESSAGELENGTH - 1] = mod_common.ChecksumCalculator(sendBuffer, MESSAGELENGTH - 1);
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
		node.on('close', function (done) {
			clearInterval(interval);
			done();
		});
	}
	RED.nodes.registerType("Bridge-Module", GOcontrollBridgeModule);
}
