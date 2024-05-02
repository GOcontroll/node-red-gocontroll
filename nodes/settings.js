module.exports = function(RED) {
    "use strict"

	const fs = require('fs');

	function GOcontrollSettings(config) {
		RED.nodes.createNode(this,config);

		var node = this;

		Settings_ShowVersionInformation ();
		
		/***************************************************************************************
		** \brief
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		function Settings_ShowVersionInformation (){
			try {
				var PackageVersion = fs.readFileSync('/root/version.txt').toString().split(/\r?\n/);
			} catch {
				var PackageVersion = fs.readFileSync('/version.txt').toString().split(/\r?\n/);
			}
			node.status({fill:"green",shape:"dot",text:"GOcontroll SW: "+ PackageVersion[0] });
		}
	}
	

	RED.nodes.registerType("Settings",GOcontrollSettings);

	RED.httpAdmin.get("/controllertype", RED.auth.needsPermission(""), function(req, res) {
		try {
			res.json(fs.readFileSync("/sys/firmware/devicetree/base/hardware").toString())
		} catch (e) {
			res.json("");
		}
	});
}
