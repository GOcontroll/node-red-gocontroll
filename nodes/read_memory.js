module.exports = function(RED) {
    "use strict"

	function GOcontrollReadMemory(config) {
	   RED.nodes.createNode(this,config);

		var fs 		= require('fs');

		var node 		= this;

		const key 			= config.key;
		const memoryType 	= config.memtype;
		const interval 		= parseInt(config.interval,10);
		const outputType	= config.outputtype;
		
		var intervalGetData;
		var msgOut = {};

		var path;
		
		if (memoryType === "emmc")
		{
		path = '/usr/mem-sim/';	
		}
		else
		{
		path = '/dev/shm/';	
		}

		if(interval != 0){
		intervalGetData = setInterval(ReadMemory_GetData,interval);
		}
		/* In case the value needs to be retrieved once */
		else{
		ReadMemory_GetData()	
		}
		/***************************************************************************************
		** \brief	Function that received data from the pipe (stream call back)
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		function ReadMemory_GetData(){
	
			/* First check if folder is present if not, create one*/
			if (!fs.existsSync(path)) {
			fs.mkdirSync(path);
			}
	
			/* Check if there are multiple keys used in the block */
			var splittedKeys = key.split(',');
			
			if(splittedKeys.length > 1)
			{
				if(outputType === "payload")
				{
					node.warn("Multiple keys found. Not able to provide one, numeric playload")
					return;
				}
				
				for(let k = 0; k < splittedKeys.length; k ++)
				{
			
					var fileContents;
					try {
					fileContents = fs.readFileSync(path+String(splittedKeys[k]));
					} catch (err) {
					/* For debugging purposes otherwise to much noise on debug window */
					//node.warn("Error during key search");	
					  // Here you get the error when the file was not found,
					  // but you also get any other error
					}
								
				msgOut[String(splittedKeys[k])] =  parseFloat(fileContents);
				}
			
				
				node.send(msgOut);
				return;
			}
	
	
			fs.readFile(path+key, (err, data) => {
			
			if(!isNaN(data))
			{
				
				if(outputType === "payload")
				{
					msgOut.payload = parseFloat(data);
				}
				else
				{
					msgOut[key]= parseFloat(data);
				}
				
			node.send(msgOut);
			}
			
			if (err)
			{
			/* For debugging purposes otherwise to much noise on debug window */
			//node.warn("Problem reading from memory key: "+key);
			return;
			}
			
			});
		}


		/***************************************************************************************
		** \brief	Function that received data from the pipe (stream call back)
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
		** \brief	Function that received data from the pipe (stream call back)
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		node.on('close', function(done) {
		clearInterval(intervalGetData)
		done();
		});
    }
	RED.nodes.registerType("Read-Memory",GOcontrollReadMemory);
}
