module.exports = function(RED) {
    "use strict"

	function GOcontrollWriteMemory(config) {
	   RED.nodes.createNode(this,config);

	const fs = require('fs');

	var node = this;
	
	const key 			= config.key;
	const memoryType	= config.memtype;
	const inputType		= config.inputtype;
	const decimal		= parseInt(config.decimal);

	var oldValue ={};
	
	var path = {};
	
	if (memoryType === "emmc")
	{
	path = '/usr/mem-sim/';	
	}
	else
	{
	path = '/dev/shm/';	
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
    
		/* First check if folder is present if not, create one*/
		if (!fs.existsSync(path)) {
		fs.mkdirSync(path);
		}
					
		/* If no key is given, the function listens to all keys and save them */ 
		if(key == "")
		{
			if(inputType === "payload")
			{
				node.warn("When the input is a payload, a key to store the value is manditory");
				return;
			}
			
			for(var prop in msg) {
				if (msg.hasOwnProperty(prop)) {							
					fs.writeFileSync(path+prop, String(parseFloat(msg[prop]).toFixed(decimal)), (err) => {
						if (err) throw err;

						});
				}
			}
		}
		
		/* If key is provided, use the specific key to send data */
		else if(msg[key] != NaN && inputType === "object")
		{
			fs.writeFileSync(path+key, String(parseFloat(msg[key]).toFixed(decimal)), (err) => {
			if (err) throw err;
			//console.log('The file has been saved!');
			});
		}
		else if (msg.payload != NaN)
		{
			fs.writeFileSync(path+key, String(parseFloat(msg.payload).toFixed(decimal)), (err) => {
			if (err) throw err;
			//console.log('The file has been saved!');
			});
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
	done();
	});
		
		
    }
	RED.nodes.registerType("Write-Memory",GOcontrollWriteMemory);
}
