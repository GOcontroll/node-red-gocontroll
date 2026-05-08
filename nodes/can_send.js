module.exports = function(RED) {
    "use strict"

    var can = require("socketcan");

    const SENDTRIGGER_ON_INPUT = 0;
    const SENDTRIGGER_INTERVAL = 1;

    function GOcontrollCanSend(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        const canChannel  = config.caninterface;
        const canIdHex    = config.canid;
        const canid       = parseInt(config.canid, 16);
        const canidtype   = config.canidtype;
        const sendTrigger = parseInt(config.send, 10);
        const caninterval = parseInt(config.caninterval, 10);

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

        const extendedid = (canidtype !== "standard");

        var channel;
        try {
            channel = can.createRawChannel("" + canInterface, true);
        } catch (ex) {
            node.error("CAN not found: " + canInterface);
            return;
        }

        const frame = {
            canid: canid,
            ext:   extendedid,
            data:  Buffer.alloc(dlc)
        };

        var interval = null;

        function updateBufferFromPayload(payload) {
            if (!Array.isArray(payload) && !Buffer.isBuffer(payload)) {
                node.warn("msg.payload must be an array of bytes (0..255) for CAN ID 0x" + canIdHex);
                return false;
            }
            frame.data.fill(0);
            const n = Math.min(payload.length, dlc);
            for (var i = 0; i < n; i++) {
                var v = Number(payload[i]);
                if (!Number.isFinite(v)) { v = 0; }
                v = Math.round(v);
                if (v > 255) { v = 255; }
                if (v < 0)   { v = 0; }
                frame.data.writeUInt8(v, i);
            }
            return true;
        }

        function sendFrame() {
            channel.send({ id: frame.canid, ext: extendedid, data: frame.data });
        }

        channel.start();

        if (sendTrigger === SENDTRIGGER_INTERVAL) {
            node.on('input', function (msg) {
                updateBufferFromPayload(msg.payload);
            });
            if (!Number.isFinite(caninterval) || caninterval <= 0) {
                node.error("Interval (ms) missing or invalid for cyclic send");
            } else {
                interval = setInterval(sendFrame, caninterval);
            }
        } else {
            node.on('input', function (msg) {
                if (updateBufferFromPayload(msg.payload)) {
                    sendFrame();
                }
            });
        }

        node.on('close', function () {
            if (interval) { clearInterval(interval); }
            try { channel.stop(); } catch (e) { /* ignore */ }
        });
    }

    RED.nodes.registerType("CAN-Send", GOcontrollCanSend);
}
