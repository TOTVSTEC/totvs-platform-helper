# totvs-platform-helper

> 

## Getting Started



### Class **SmartClient**

### Constructor(directory, executable)

+ **directory** (Type: `String`, Default: `process.cwd()`)

+ **executable** (Type: `String`, Default: `smartclient.exe (windows) or smartclient (linux)`)

```js
var SmartClient = require('totvs-platform-helper/smartclient'),
    sc = new SmartClient('C:\\TOTVS\\bin\\smartclient', 'sc.exe');
```

### Method **run**(options) 
Returns: `Promise`

Execute the SmartClient with the provided options, fulfilling the promise when the program ends.

+ **options** (Type: `Object`)

  A set of key/value pairs that contains the parameters to run the smartclient

  ```js
  var SmartClient = require('totvs-platform-helper/smartclient'),
      sc = new SmartClient('C:\\TOTVS\\bin\\smartclient');

  sc.run({
    program: 'SIGAFAT',
    connection: 'TCP',
    environment: 'ENVIRONMENT'
  })
  .then(function() {
    console.log('SmartClient Finished!');
  });
  ```

+ **options.program** (Type: `String`, Default: `"SIGAFAT"`)

  The "Starting Program"

+ **options.connection** (Type: `String | Object`, Default: `"TCP"`)

  The server connection info.

  Using String to read server address/port from smartclient.ini:
  ```js 
  connection: "TCP"
  ```

  Using Object to define server address/port:
  ```js 
  connection: {
    address: "localhost",
    port: 1234
  }
  ```

+ **options.environment** (Type: `String`, Default: `"ENVIRONMENT"`)

  The Server Environment

+ **options.quiet** (Type: `Boolean`, Default: `true`)

  Supress the application Splash Screen

+ **options.args** (Type: `Array`)

  List of string arguments
