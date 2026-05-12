#### V2.3.3
- Upgraded `serialport` to `^10.5.0` for better Node 14+ compatibility

#### V2.3.2
- Pinned `node-gyp` to `^9.4.0` for Node 14 compatibility

#### V2.3.1
- Added NaN checks in `read_memory` and `write_memory` to prevent crashes on invalid input
- Fixed `msgOut` leak in `write_simulink_parameter`
- Improved error logging on memory and simulink nodes

#### V2.3.0
- Renewed CAN interface: simplified `can_receive` and `can_send` UI and implementation
- Added selectable output data type on most nodes for flexible payload formatting
- Added selectable output type to `controller_temperature`

#### V2.2.0
- All module/sensor nodes now send output under `msg.payload` (Node-RED convention)
- `output_module_6`: removed dead event handlers for output7-10 and unused `moduleType` default
- `input_module_6`: removed unused `moduleType`/`input7` defaults and dead key/input array entries
- `input_module_6` help: fixed pulse counter key (`channel12pulses`) and invalid JSON example
- `input_module_10` help: fixed malformed JSON in pulse counter example
- `output_module_10`: fixed missing `<` on h2 tag
- `bridge_module`: fixed mismatched h3/h2 closing tags
- `write_simulink_parameter`: fixed stray `>` after closing script tag
- CAN help texts: updated controller names to Moduline L4 / M1 / HMI1
- `controller_supply`: modernised controller names (Moduline III → L3) and added `msg.payload` to examples
- All output help texts: added `msg.payload` label to data format examples
- Package renamed to `@gocontroll/node-red-gocontroll` scope
- CI: added npm publish workflow with auto GitHub release on tag push, gated on a verify job

#### V2.1.11
- re-ad moduleType to the config of 6 channel in/ouput modules

#### V2.1.10
- Fix some documentation and beviour of the write_simulink_parameter node

#### V2.1.9
- Fix the pull up value of the 10 channel input module
- Slightly tune up the output module docs, no actual content changes

#### V2.1.8
- Small addition to README

#### V2.1.7
- Fixed the ADC node on the Moduline Mini

#### V2.1.6
- Fixed the version of uiojs to actually fix new packaging

#### V2.1.5
- Fixed some datatypes for the 10 channel output module
- Fixed some simulink related functions to work with new deb packaging

#### V2.1.4
- Added dutycycle output to 6 channel output module when peak and hold is selected

#### V2.1.3
- Fixed incorrect ground shift datatype in the 6 channel output module
- Add node-red types to dev depencies for type hints during development

#### V2.1.2
- Fixed potential crash in module_common.js when a module node was present with an invalid slot configuration

#### V2.1.1
- Added a version check to the second supply enable on the 10 channel input module

#### V2.1.0
- Added module supply field for output modules with the correct hardware version
- Small documentation improvement for the controller supply node

#### V2.0.0
- Removed seperate input module reset node, this is now part of the input module which has now gained an input port
- Seperated the 6-10 channel in/output modules into their own nodes to simplify them
- Added 4-20mA module
- Settings node no longer gives an error about the version file
- Corrected some module settings and documentation
- Improved the module verification mechanism, now actually listens to the module instead of reading a file
- Extracted the module init code into its own reusable module
- Controller type depenent settings are now configured via http request instead of patching them when installing

#### V1.0.0
Initial packaging for npm
