'use strict';

var express = require('express'); // app server
var bodyParser = require('body-parser'); // parser for post requests
const AssistantV2 = require('ibm-watson/assistant/v2'); // watson sdk
const { IamAuthenticator } = require('ibm-watson/auth');

const config = require("./config.js");
const util = require("./util.js");
const colored_console = require("./console-helper.js");

const sql = require('mssql');
let connection;

const moment = require("moment");

let os = require("os");

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
      context: req.body.context || { "skills": { 'main skill': { "user_defined": { "protocol": makeProtocol() } } } },
      input: req.body.input || { options: { 'return_context': true } },
      alternate_intents: true
    };

    // Send the input to the assistant service
    const data = await assistant.message(payload)

    return res.json(await updateMessage(payload, data.result));
  }
  catch (err) {
    console.log(err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ "msg": "Ocorreu um erro no servidor da aplicação.", "err": err }));
    return null;
  }
}

/* END OF THE WATSON SPECIFIC METHODS */

async function updateMessage(input, response) {
  if (!response.output) {
    response.output = {};
  }
  else {

    response.context.skills['main skill'].user_defined.consulta_confirmada = await dbLog(parseLogInfo(input, response));

    response.session_id = input.sessionId;
    return response;
  }
}

function parseLogInfo(input, response) {
  return {
    id: 0,
    profile: { "user": "USU", "bot": "VIR" },
    name: response.context.name ? response.context.name : "Não Identificado",
    conversation_date: moment().format("yyyy-MM-DD hh:mm:ss"),
    message_date: moment().format("yyyy-MM-DD hh:mm:ss"),
    intent: (response.output && response.output.intents && response.output.intents.length > 0) ? response.output.intents[0] : { "intent": "BOT", "confidence": 1 },
    input: clientText(input),
    output: botText(response),

    cpf: response.context.cpf || "00000000000",
    protocol: response.context.skills['main skill'].user_defined.protocol,

    agenda: {
      cpf: response.context.skills['main skill'].user_defined.cpf_consulta,
      data: response.context.skills['main skill'].user_defined.dia_consulta,
      hora: response.context.skills['main skill'].user_defined.horario_consulta,
      pedido: response.context.skills['main skill'].user_defined.pedido_consulta
    }
  }
}

async function dbLog(conversation_info) {
  let info = conversation_info;

  try {
    connection = await new sql.ConnectionPool(config.settings).connect();

    // confere se ja tem uma conversa
    const rows = await connection.request()
      .input("informed_protocol", sql.VarChar(15), info.protocol)
      .query("SELECT OID_CONVERSA AS id, COD_PROTOCOLO AS protocol FROM CONVERSA WHERE COD_PROTOCOLO = @informed_protocol");

    // se nao tiver, insere uma nova no banco
    if (rows.rowsAffected[0] === 0) {
      let values = `('${info.protocol}', '${info.name}', '${info.cpf}', '${info.conversation_date}')`;
      await connection.request().query("INSERT INTO CONVERSA (COD_PROTOCOLO, NOM_USUARIO, CPF_USUARIO, DTA_INI_CONVERSA) VALUES " + values);
    }

    // busca o id da conversa atual
    const result = await connection.request()
      .input("informed_protocol", sql.VarChar(15), info.protocol)
      .query("SELECT OID_CONVERSA AS id, COD_PROTOCOLO AS protocol FROM CONVERSA WHERE COD_PROTOCOLO = @informed_protocol");

    info.id = result.recordset[0].id;
    // atualiza o no da conversa no banco caso tenha alteracoes
    await updateConversation(info);

    // insere as mensagens do usuario e do bot
    let user_msg = `(${info.id}, '${info.profile.user}', '${info.input}', '${info.message_date}', '${info.intent.intent}', '${info.intent.confidence}', '${info.name}')`;

    let bot_msg = `(${info.id}, '${info.profile.bot}', '${info.output}', '${info.message_date}', '${info.intent.intent}', '${info.intent.confidence}', 'BOT')`;

    let msg = user_msg + "," + bot_msg;
    await connection.request().query("INSERT INTO MENSAGEM (OID_CONVERSA, IND_AUTOR, DES_MENSAGEM, DTA_MENSAGEM, NOM_INTENT, VAL_GRAU_CONFIANCA, NOM_AUTOR) VALUES " + msg);

    // confere se tem um pedido de marcar consulta
    if (info.agenda.cpf !== undefined && info.agenda.cpf !== null &&
      info.agenda.data !== undefined && info.agenda.cpf !== null &&
      info.agenda.hora !== undefined && info.agenda.cpf !== null &&
      info.agenda.pedido === true
    ) {
      // monta a variavel de data
      const data_informada = info.agenda.data + " " + info.agenda.hora;
      // conferir se ja tem uma consulta para esse horario
      const consultas = await connection.request().query(`SELECT * FROM AGENDA A WHERE DATA_CONSULTA <= '${data_informada}' AND '${data_informada}' <= DATEADD(MINUTE, 30, DATA_CONSULTA)`);
      // nao tem horario marcado
      if (consultas.rowsAffected[0] === 0) {
        await connection.request().query(`INSERT INTO AGENDA (OID_CONVERSA, DATA_CONSULTA, CPF_PACIENTE) VALUES (${info.id}, '${data_informada}', '${info.agenda.cpf}')`);
        return "true";
      }
      // ja tem horario marcado
      else {
        return "false";
      }
    }

    connection.close();
    colored_console.log.green("I loaded the message exchange to the database.");
  }
  catch (err) {
    dbErr(err, connection);
  }
}

function dbErr(err, con) {
  if (con && con.end) con.end();
  colored_console.log.red(`Error! Here is the data:${os.EOL}`);
  colored_console.log.red(err);
  if (err.sqlMessage) {
    colored_console.log.red(err.sqlMessage);
    colored_console.log.red(`${err.code} (#${err.errno})`);
  }
}

function makeProtocol(stat = 1) {
  const id = moment();
  const protocol = id.format("yyyyMMDDhhmmss") + stat;
  colored_console.log.yellow(`The protocol number for this conversation is ${protocol}\.`);
  return protocol;
}


async function updateConversation(info) {
  if (info.name === "Não Identificado" && info.cpf === "00000000000") {
    return;
  }

  try {
    connection = await new sql.ConnectionPool(monika.config.sql.settings).connect()

    if (info.name !== "Não Identificado") {
      const results = await connection.request()
        .input("new_info", sql.VarChar(100), info.name)
        .input("idt", sql.Int, info.id)
        .query("UPDATE CONVERSA SET NOM_USUARIO = @new_info WHERE OID_CONVERSA = @idt AND NOM_USUARIO = 'Não Identificado'")

      if (results.affectedRows > 0) {
        colored_console.log.yellow("I have updated the conversation info.");
      }
    }

    if (info.cpf !== "00000000000") {
      const results = await connection.request()
        .input("new_info", sql.VarChar(11), info.cpf)
        .input("idt", sql.Int, info.id)
        .query("UPDATE CONVERSA SET CPF_USUARIO = @new_info WHERE OID_CONVERSA = @idt AND CPF_USUARIO = '00000000000'")

      if (results.affectedRows > 0) {
        colored_console.log.yellow("I have updated the conversation info.");
      }
    }

  }
  catch (err) {
    dbErr(err, connection, res, ["update", current_level]);
  }
}

function botText(response) {
  if (response.output && response.output.generic && response.output.generic.length > 0) {
    let txt = "";
    for (let i = 0; i < response.output.generic.length; i++) {
      txt = txt + (response.output.generic.length > 0 ? (response.output.generic[i].text + os.EOL) : "");
    }
    return txt;
  }
  return "";
}

function clientText(request) {
  return (request.input && request.input.hasOwnProperty('text') > 0 ? (request.input.text + os.EOL) : "");
}


// Endpoint to be called from the client side
app.get("/", (req, res) => util.redirects.bot(req, res));
app.post("/api/message", (req, res) => messager(req, res));

module.exports = app;
