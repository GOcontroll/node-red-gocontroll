module.exports = function(RED) {
    "use strict"

	const fs = require('fs');

	function GOcontrollControllerActive(config) {
	   RED.nodes.createNode(this,config);

	const objectInput = (config.objectInput !== false);

	/***************************************************************************************
	** \brief	Funtion called on message injection
	**
	** \param	msg
	** \return	none
	**
	****************************************************************************************/
	this.on('input', function(msg) {
			var src = objectInput ? msg : (msg.payload || {});

			if(src["controllerActive"] == 1)
			{
			fs.writeFileSync('/sys/class/leds/power-active/brightness','255');
			}
			else
			{
			fs.writeFileSync('/sys/class/leds/power-active/brightness','0');
			}

        });
    }
	RED.nodes.registerType("Controller-Active",GOcontrollControllerActive);
}
