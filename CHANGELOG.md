# V2.1.9

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
