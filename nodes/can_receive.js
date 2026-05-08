module.exports = function(RED) {
    "use strict";

    var can = require('socketcan');

    function CanReceiveNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        const canChannel = config.caninterface;
        const canIdHex   = config.canid;
        const canid      = parseInt(config.canid, 16);
        const canidtype  = config.canidtype || "standard";
        const extendedid = (canidtype !== "standard");

        var dlc = parseInt(config.dlc, 10);
        if (!Number.isFinite(dlc) || dlc < 0 || dlc > 8) {
            node.warn("DLC missing or out of range (0..8) — defaulting to 8");
            dlc = 8;
        }

        if (!Number.isFinite(canid)) {
            node.error("CAN ID is not a valid hexadecimal value");
            return;
        }
        if (canidtype === "standard" && canid > 0x7FF) {
            node.error("Message Identifier too high for standard identifier (11 bits)");
        }
        if (canidtype === "extended" && canid > 0x1FFFFFFF) {
            node.error("Message Identifier too high for extended identifier (29 bits)");
        }

        var canInterface = "can0";
        if      (canChannel == "CAN 1") { canInterface = "can0"; }
        else if (canChannel == "CAN 2") { canInterface = "can1"; }
        else if (canChannel == "CAN 3") { canInterface = "can2"; }
        else if (canChannel == "CAN 4") { canInterface = "can3"; }

        var channel;
        try {
            channel = can.createRawChannel("" + canInterface, true);
        } catch (ex) {
            node.error("CAN not found: " + canInterface);
            return;
        }

        channel.start();

        channel.addListener("onMessage", function (frame) {
            if (frame.id !== canid)         { return; }
            if (Boolean(frame.ext) !== extendedid) { return; }

            if (frame.data.length !== dlc) {
                node.warn("Received CAN message on 0x" + canIdHex +
                          " has " + frame.data.length + " bytes, expected " + dlc);
            }

            node.send({
                payload: Array.from(frame.data),
                canid:   frame.id,
                dlc:     frame.data.length,
                rtr:     frame.rtr,
                ext:     Boolean(frame.ext)
            });
        });

        node.on("close", function () {
            try { channel.stop(); } catch (e) { /* ignore */ }
        });
    }

    RED.nodes.registerType("CAN-Receive", CanReceiveNode);
}
