
// The ConversationPanel module is designed to handle
// all display and behaviors of the conversation column of the app.

var ConversationPanel = (() => {
  let bia_typing;
  let input_box;
  let timer;
  var settings = {
    selectors: {
      chatBox: '#scrollingChat',
      fromUser: '.user-message',
      fromWatson: '.bot-message',
      latest: '.latest'
    }
  };

  // This function is used to set an automatic "time out", disabling further messages
  // though i turned it off for now to make the chat flow a bit easier
  function chatTimeOut(newPayload) {
    if (timer) {
      clearTimeout(timer);
      timer = 0;
    }
    timer = setTimeout(function () {
      if (!newPayload.context.skills["main skill"].user_defined.timedout) {
        chat.actions.lock("textInput", "Chat encerrado.");
        chat.actions.unlock = util.disabled();
        newPayload.context.skills["main skill"].user_defined.timedout = true;
        Api.sendRequest('Tchau.', newPayload.context);
        sessionStorage.removeItem("watson_session");
        $(".chat-button").attr("disabled", "disabled");
      }
    }, 240000);
    if (newPayload.output !== undefined && newPayload.output.user_defined !== undefined) {
      const action = newPayload.output.user_defined.action;
      if (action === 'end_conversation') {
        timedLock(5000);
      }
      if (action === 'abrupt_end') {
        timedLock(1000);
      }
    }
  }

  // Set up callbacks on payload setters in Api module
  // This causes the displayMessage function to be called when messages are sent / received
  function chatUpdateSetup() {
    let setter = Api.setPayload;
    Api.setPayload = (kind, newPayloadStr, user) => {
      setter.call(Api, kind, newPayloadStr);
      displayMessage(JSON.parse(newPayloadStr), user);
    };
  }

  // starts the process of displaying chat messages
  function displayMessage(newPayload, typeValue) {
    var isUser = typeValue;
    var textExists = (newPayload.input && newPayload.input.text)
      || (newPayload.output && newPayload.output.generic.length > 0);
    if (isUser !== null && textExists) {
      msgOutput(newPayload, isUser);
      // chatTimeOut(newPayload);
    }
    // botar msg de erro
  }

  // watson response may be plain text or an options list, here we can process it for display
  function generateOptions(optionsArr) {
    let options = $("<ul>");

    for (let i = 0; i < optionsArr.length; i++) {
      options.append($("<li>").append($("<button>", { "class": "chat-button", /*"onclick": "ConversationPanel.submitOption(this)",*/ "type": "button", "value": optionsArr[i].value.input.text }).append(optionsArr[i].label)));
    }
    options.find("button").click((event) => ConversationPanel.submitOption(event.currentTarget));
    return options;
  }

  // initiates the chat interface and calls the watson api
  function init() {
    bia_typing = $(".message-typing");
    input_box = $("#textInput");

    sessionStorage.removeItem("watson_session");
    chatUpdateSetup();
    Api.sendRequest('', null); //sends a blank message to watson
  }

  // sends message on ENTER
  function inputKeyDown(event, input_box) {
    if (event.keyCode === 13 && input_box.value) {
      chat.actions.send();
    }
  }

  // appends the chat bubble with its text on the chat window, it works for both user and bot
  function msgAppend(current, isUser) {
    let name = isUser ? "Você" : "Sophia";

    const generalInfo = [
      $("<span>", { "class": `message-data-name${(isUser ? '-user' : '-bot')}` }).append(name).append($("<i>", { "class": `fas fa-circle ${(isUser ? 'user' : 'online')}` })),
      $("<span>", { "class": "message-data-time" }).append(util.now())
    ];

    let output;
    if (current.hasOwnProperty('options')) {
      output = (
        $("<span>").append(current.title),
        $("<span>").append(generateOptions(current.options))
      );
    }
    else {
      output = $("<span>").append(current.text);
    }

    $(settings.selectors.chatBox).append(
      $("<li>", { "class": "clearfix" }).append(
        $("<div>", { "class": `message-data ${(isUser ? 'align-right' : '')}` }).append(
          (isUser ? [generalInfo[1], generalInfo[0]] : [generalInfo[0], generalInfo[1]])
        ),
        $("<div>", { "class": `message latest ${(isUser ? 'user-message float-right' : 'bot-message')}` }).append(
          $("<p>", { "class": "bubble" }).append(output)
        )
      ));
  }

  // delays the message appending based on text length * 10, in milliseconds
  function msgDelay(item, index, array, resolve, newPayload, isUser) {
    const temp_item = isUser ? newPayload.input : newPayload.output.generic[index];
    const times = (temp_item.text || temp_item.title).length * 10;
    if (isUser) {
      msgAppend({ text: item }, isUser);
      chat.actions.lock("textInput", "Por favor, aguarde.");
      setTimeout(() => {
        bia_typing.css({ "visibility": "visible" });
      }, times);
      resolve();
    }
    else if (!isUser) {
      setTimeout(() => {
        msgAppend(item, isUser);
        bia_typing.css({ "visibility": "hidden" });
        newPayload.output.text = item;
        if ((index + 1) !== array.length) {
          bia_typing.css({ "visibility": "visible" });
        }
        if ((index + 1) === array.length) {
          chat.actions.unlock("textInput");
        }
        chat.actions.scrollToChatBottom("history", 500)
        resolve();
      }, times);
    }
  }

  /*
  watson response may contain more than one text node, here we prepare an array with
  all the text nodes and send them for display, each node is display with a delay
  to mimic a person typing at "normal speed", so the longer the text the longer it takes
  to show up in the screen
  */
  function msgOutput(newPayload, isUser) {
    $(".latest").removeClass("latest");
    let text_obj = isUser ? newPayload.input.text : newPayload.output.generic;
    if (Object.prototype.toString.call(text_obj) !== '[object Array]') {
      text_obj = [text_obj];
    }

    let msgReducer = text_obj.reduce((PC, item, index, array) => {
      return PC.then(() => new Promise((resolve) => {
        msgDelay(item, index, array, resolve, newPayload, isUser);
      }));
    }, Promise.resolve());

    msgReducer.then(() => chat.actions.scrollToChatBottom("history", 500));
  }

  // sends user input to watson and blocks the input node to prevent flooding
  function msgSend(context) {
    Api.sendRequest(input_box.val(), context);
    input_box.val('');
    $(".chat-button").attr("disabled", "disabled");
  }

  // sends a watson call based on the chat button option pressed
  function submitOption(target) {
    let pay = Api.getPayload("response");
    Api.sendRequest(target.value, pay.context);
    //Common.fireEvent(input_box, 'input');
    $(".chat-button").attr("disabled", "disabled");
    target.className = `${target.className} clicked`;
  }

  // used to lock down the chat in case of end of conversation of chat time out (if applicable)
  function timedLock(miliseconds) {
    clearTimeout(timer);
    timer = 0;
    timer = setTimeout(function () {
      chat.actions.lock("textInput", "Chat encerrado.");
      chat.actions.unlock = util.disabled();
      sessionStorage.removeItem("watson_session");
      $(".chat-button").attr("disabled", "disabled");
    }, miliseconds);
  }

  return {
    init: init,
    inputKeyDown: inputKeyDown,
    msgSend: msgSend,
    submitOption: submitOption,
  };
})();
