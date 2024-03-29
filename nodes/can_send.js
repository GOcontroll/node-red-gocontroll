module.exports = function(RED) {
    "use strict"
	
	var can = require("socketcan");

	function GOcontrollCanSend(sendNode) { 	 
	   RED.nodes.createNode(this,sendNode);
	
	var node = this; 
	
	/* Parse configuration as string from can config */
	const canChannel = sendNode.caninterface;  
	
	/* Parse the CAN ID to send */
	const canIdHex = sendNode.canid;
	const canid = parseInt(sendNode.canid,16);
	
		/* parse the identifier ID type */
	const canidtype = sendNode.canidtype
	

	
	if(canid > 2048 && canidtype =="standard")
	{
		node.error("Message Identifier to high for standard identifier (11 bits)");
	}
	
	/* Parse the send method */
	const sendTrigger = sendNode.send;
	
	/* Parse the interval time to send CAN message */
	const caninterval = parseInt(sendNode.caninterval,10);
	
	/* Parse the CAN DLC for the number of bytes */
	const signals = parseInt(sendNode.signals);
	
	var dlc = 0;
	
	/* Parse the dkey of the different messages */
	var key={};
	
	key[0] = sendNode.key1;
	key[1] = sendNode.key2;
	key[2] = sendNode.key3;
	key[3] = sendNode.key4;
	key[4] = sendNode.key5;
	key[5] = sendNode.key6;
	key[6] = sendNode.key7;
	key[7] = sendNode.key8;
	
	/* Parse the start byte from each signal */
	var sb={};
	sb[0] = parseInt(sendNode.sb1,10);
	sb[1] = parseInt(sendNode.sb2,10);
	sb[2] = parseInt(sendNode.sb3,10);
	sb[3] = parseInt(sendNode.sb4,10);
	sb[4] = parseInt(sendNode.sb5,10);
	sb[5] = parseInt(sendNode.sb6,10);
	sb[6] = parseInt(sendNode.sb7,10);
	sb[7] = parseInt(sendNode.sb8,10);
	
	/* Parse the end byte from each signal */
	var eb={};
	eb[0] = parseInt(sendNode.eb1,10);
	eb[1] = parseInt(sendNode.eb2,10);	
	eb[2] = parseInt(sendNode.eb3,10);
	eb[3] = parseInt(sendNode.eb4,10);
	eb[4] = parseInt(sendNode.eb5,10);
	eb[5] = parseInt(sendNode.eb6,10);
	eb[6] = parseInt(sendNode.eb7,10);
	eb[7] = parseInt(sendNode.eb8,10);
	
	var value={};
	
	/*Get the highest byte location */
	for(var i=0; i<signals; i++)
	{
		if(sb[i] > dlc)
		{
			if(sb[i] > 8)
			{
				node.error("Start byte of signal -"+key[i]+"- out of range (1-8)");	
			}
			if(sb[i] < 0)
			{
				node.error("Start byte of signal -"+key[i]+"- out of range (1-8)");	
			}
			
			dlc = sb[i];
		}
		if(eb[i] > dlc)
		{
			if(eb[i] > 8)
			{
				node.error("End byte of signal -"+key[i]+"- out of range (1-8)");	
			}
			if(eb[i] < 0)
			{
				node.error("End byte of signal -"+key[i]+"- out of range (1-8)");	
			}
			
			dlc = eb[i];
		}
		if(key[i] == "")
		{
		node.error("Key for signal "+i+" from ID: 0x"+canIdHex+" not given");		
		}
	}
	
	var canInterface = "can0";
	if(canChannel == "CAN 1"){canInterface = "can0";}
	else if (canChannel == "CAN 2"){canInterface = "can1";}
	else if (canChannel == "CAN 3"){canInterface = "can2";}
	else if (canChannel == "CAN 4"){canInterface = "can3";}
	
	/* extract type of CAN identifier */
	var extendedid;
	if(canidtype == "standard"){
	extendedid = false;}
	else{
	extendedid = true;}
	

	
	/* Create channel to communicate on */
	var channel;
	try {
		channel = can.createRawChannel(""+canInterface, true);
	}catch(ex) { 
		node.error("CAN not found:"+canInterface);		
	} 
	
	/* Create sendbuffer to contruct the CAN data Message */
	var frame={};
	frame.canid = canid;
	frame.data = Buffer.alloc(dlc); 

	/* Create new data flag */
	var newData = 0;


	var interval;
	/* Basic initialisations are done her so we can start the send interval if required */
	if(sendTrigger == 1)
	{
	/* Start interval to send CAN data*/
	interval = setInterval(SendCan_DataOut, caninterval);
	}
	
	
	if(channel)
	{	
	channel.start();
		   
	   this.on('input', function (msg) {
		 
		if(dlc > 8){
			node.error("Calculated DLC to high check data alignment!");		
			return;}

			for(var s=0; s<signals; s++)
			{
				/* check if property is available in JSON string */
				if(msg[key[s]] || msg[key[s]] === 0)
				{
					/* Exit if signal value is not changed */
					if(value[s] == msg[key[s]]){continue;}
					
					value[s] = msg[key[s]];
					
					/* Check if message uses single byte */
					if((sb[s]-eb[s]) == 0)
					{
					if(msg[key[s]] >  255){msg[key[s]] = 255;}
					if(msg[key[s]] <=  0){msg[key[s]] = 0;}
					frame.data.writeUInt8(msg[key[s]],sb[s]-1);	
					}
					else
					{
						/* Check endianess */
						/* In case big endian */
						if(sb[s]<eb[s])
						{
							if((eb[s]-sb[s]) == 1)
							{
							if(msg[key[s]] >  65535){msg[key[s]] = 65535;}
							if(msg[key[s]] <=  0){msg[key[s]] = 0;}
							frame.data.writeUInt16BE(msg[key[s]],sb[s]-1);
							}
							if((eb[s]-sb[s]) == 3)
							{
							if(msg[key[s]] >  4294967295){msg[key[s]] = 4294967295;}
							if(msg[key[s]] <=  0){msg[key[s]] = 0;}
							frame.data.writeUInt32BE(msg[key[s]],sb[s]-1);	
							}
						}
						/* In case little endian */
						else
						{
							if((sb[s]-eb[s]) == 1)
							{
							if(msg[key[s]] >  65535){msg[key[s]] = 65535;}
							if(msg[key[s]] <=  0){msg[key[s]] = 0;}
							frame.data.writeUInt16LE(msg[key[s]],eb[s]-1);
							}
							if((sb[s]-eb[s]) == 3)
							{
							if(msg[key[s]] >  4294967295){msg[key[s]] = 4294967295;}
							if(msg[key[s]] <=  0){msg[key[s]] = 0;}
							frame.data.writeUInt32LE(msg[key[s]],eb[s]-1);	
							}	
						}
					}
				/* At least one signal contains ne data */
				newData = 1;
				}
			}	
		
		/* Send only if data is new */
		if( newData == 1 && sendTrigger == 0)
		{
		SendCan_DataOut();
		newData = 0;
		return;
		}
			   
	   });
	   	   
	this.on("close", function() {
	clearInterval(interval);
	channel.stop();
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
	function SendCan_DataOut (){
		channel.send({ id: frame.canid,
		ext: extendedid,
		data: frame.data });  
	} 
}

	RED.nodes.registerType("CAN-Send",GOcontrollCanSend);
}