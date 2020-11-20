'use strict';

var express = require('express'); // app server
var bodyParser = require('body-parser'); // parser for post requests
const AssistantV2 = require('ibm-watson/assistant/v2'); // watson sdk
const { IamAuthenticator } = require('ibm-watson/auth');

const config = require("./config.js");
const util = require("./util.js");

var app = express();

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

/*
The following two methods are where all the watson magic happens
PLEASE DO NOT TOUCH THEM
summary:
createSession: creates a new session for the watson sdk
messager: process user input and watson output and sends back the whole package to the frontend

there is also a third method called "updateMessage", there we can manipulate the input/output before
sending back a response, for example if you need to update a table in the database, that is the place
*/

async function createSession(assistant, assistant_id) {
  try {
    return await assistant.createSession({
      assistantId: assistant_id
    });
  }
  catch (err) {
    console.log(err);
  }
}

async function messager(req, res) {
  try {
    const watson_session = req.body.watson_session;

    const workspace = config.ASSISTANT_ID; //monika.config.workspace || '<workspace-id>';
    if (!workspace || workspace === '<workspace-id>') {
      return res.json({
        'output': {
          'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the '
            + '<a href="https://github.com/watson-developer-cloud/assistant-simple">README</a> documentation on how to set this variable. <br>'
        }
      });
    }

    // Create the service wrapper
    const assistant = new AssistantV2({
      version: process.env.IBM_API_VERSION, //'2020-04-01', //'2020-02-05',//'2018-07-10',
      authenticator: new IamAuthenticator({
        apikey: config.IBM_API_KEY,
      })
    });

    const sessionId = await createSession(assistant, workspace);

    const payload = {
      assistantId: workspace,
      sessionId: watson_session || sessionId.result.session_id,
      context: req.body.context,
      input: req.body.input || { options: { 'return_context': true } },
      alternate_intents: true
    };

    // Send the input to the assistant service
    const data = await assistant.message(payload)

    return res.json(updateMessage(payload, data.result));
  }
  catch (err) {
    console.log(err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ "msg": "Ocorreu um erro no servidor da aplicação.", "err": err }));
    return null;
  }
}

/* END OF THE WATSON SPECIFIC METHODS */

function updateMessage(input, response) {
  if (!response.output) {
    response.output = {};
  }
  else {
    /*
    you may do sql calls here, below an example

    const mysql = require("promise-mysql");

    const config = require("./config.js");

    let info = {};

    mysql.createConnection(config.MYSQL)
    .then((conn) => {
      connection = conn;
      return connection.query("SELECT date_index, amount FROM <TABLE>");
    })
    .then((data) => {
      connection.end();
      for(let d = 0; d < data.length; d++){
        info[data[d].date_index] = data[d].amount;
      }
    }
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(info));


    alternatively (only works in an async function):

    const connection = await mysql.createConnection(config.MYSQL);
    const data = await connection.query("SELECT date_index, amount FROM <TABLE>");

    for(let d = 0; d < data.length; d++){
      info[data[d].date_index] = data[d].amount;
    }

    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(info));
     */
    response.session_id = input.sessionId;
    return response;
  }
}

// Endpoint to be called from the client side
app.get("/", (req, res) => util.redirects.bot(req, res));
app.post("/api/message", (req, res) => messager(req, res));

module.exports = app;
