# V2.1.2

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