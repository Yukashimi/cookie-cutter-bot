# Virtual Assistant
A Virtual Assistant built using IBM's Watson.
This chat interface is HTML5 based and is deployed by a node.js server, but the training data isn't publicly available, if you have your own training data it's possible to utilize this server and interface with it by setting your Environment variables (name changes from version to version, please refer to the official docs) on the .env file.

## Deployment
Install the node framework, then run `>> npm install` to install the modules especified on the `package.json` file.
To run you can use `>> npm start` or run the command directly with `>> node server.js`, the package has the difinition of what npm start calls.
Once the server is loaded you can access the bot by opening the correspondent html file.

### Main Files in the Project
1. bot.html: this is the main interface and where you can interact with the bot. If you don't load the scripts at `/js/watson-api/`dir then it's possible to load the interface without booting the bot every single time, the html document in itself also has demostration mensagens, they are commented in the code itself, so just uncomment to see. There is also a file called `ui-tester.html` which doesn't load the api by default and lets you mess around freely.
2. app.js: where the backend magic happens, the watson api calls happens there, you may also use it for further processing input and output text nodes before sending them to the client.
3. conversation.js: client file where the UI is processed, it loads and appends the chat bubbles based on the text nodes recieved from the api, if you change the structure on `bot.html` you will have to edit this file too
