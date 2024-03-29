# node-red-gocontroll
A package for the GOcontroll node red nodes

provides access to some of the GOcontroll peripherals through node red

## controller active
This node can be used to shut down the controller when all kl15s are low, this is a hard shutdown as it works by removing the voltage from the cpu enable pin.
Use cautiously because of this, as it risks corrupting files that are currently buffered and not yet written to the filesystem.

## controller supply
This node can be used to read out 4 different ADC values, K30 or battery voltage, and the 3 K15s that are present K15A/B/C.

## controller_temperature
Reads the cpu temperature.

## status led
Controls the 4 enclosure LEDs.
Note: the GOcontroll Moduline Display does not possess these leds therefore this node has no function on that particular board.

## gps
Reads out the option gps antenna that can be attached when the controller is equipped with an LTE modem.
Note: the GOcontroll Moduline Display can't be equipped with an LTE modem therefore this node has no function on that particular board.

## input module
Reads out a 6 or 10 channel input module, output depends on how it is configured in the node.
Note: if there is a different program (most often a compiled Simulink model) that will try to initialize the modules running, it will cause strange behaviour.
It is required that only one application claiming the modules is running.

## input module reset
(Re)sets the counter of a certain input channel on an input module, this only works when the input module is configured to provide counter functionality.

## output module
Controls a 6 or 10 channel output module, outputs some information about the module like temperature, ground shift, status code and current.
Note only a 6 channel module provides current per channel, the 10 channel module can only measure total current.

## bridge module
Controls a 2 channel output module also called the bridge module. It is nearly identical to the regular output module in interfacing.
This one also provides a current per channel feedback.

## can receive
Allows for reading out the CAN busses on the GOcontroll Moduline controllers.

## can send
Allows for sending messages on the CAN busses available on the GOcontroll Moduline controllers.

## read memory
Reads from a file with the name of the key in either /dev/shm or /usr/mem-sim, used for IPC between node-red flows and simulink models in general.
Can also be used for configuration parameters of your flow.

## write memory
The same as read memory except it writes to the file.

## read simulink signal
Allows for directly reading asap2 signals or "measurements" from a running application that provides the necessary information.
This information consists of a signals.json file located in /usr/node-red-static/.
This file should contain signal names, memory addresses, datatypes and array sizes:
``` json
{
    "Signal1Name": {
        "address": 4373576,
        "type": 0,
        "size": 1
    },
    "Signal2Name": {
        "address": 4374760,
        "type": 0,
        "size": 1
    }
}
```
see [uiojs](https://www.npmjs.com/package/uiojs) for more info about the types for example.

## write simulink parameter
Allows for writing to asap2 parameters or "characteristics" of a running application that provides the necessary information.
This information consists of a parameters.json file located in /usr/node-red-static/.
This file should contain parameter names, memory addresses, datatypes and array sizes:
``` json
{
    "Param1Name": {
        "address": 4363616,
        "type": 2,
        "size": 1
    },
	"Param2Name": {
        "address": 4363618,
        "type": 2,
        "size": 1
    }
}
```
see [uiojs](https://www.npmjs.com/package/uiojs) for more info about the types for example.