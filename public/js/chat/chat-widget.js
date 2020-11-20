
var chat = {}

chat.actions = (function () {
  let chat;
  let docs;
  let docs_toggler;
  let docs_insider;
  let login;
  let sender;

  $(document).ready(
    function () {
      init();

      $("#scrollingChat").on("click", ".glossary",
        function () {
          var context;
          var latestResponse = Api.getPayload("response");
          if (latestResponse) {
            context = latestResponse.context;
          }
          Api.sendRequest($(this).attr("value"), context);
          $(this).addClass("disabled-link");
        });
    }
  );

  function lock(inputID, placeholder) {
    $(`#${inputID}`).attr("disabled", "disabled");
    $(`#${inputID}`).attr("placeholder", placeholder);
  }

  function unlock(inputID) {
    $(`#${inputID}`).removeAttr("disabled");
    $(`#${inputID}`).attr("placeholder", "Digite sua mensagem");
    $(`#${inputID}`).focus();
  }

  function hideDocs() {
    docs.toggleClass("show-docs");
  }

  function init() {
    initUI();
    setActions();
  }

  function initUI() {
    docs_toggler = $("#docs-toggler");
    docs_insider = $("#docs-toggler-inside");
    chat = $("#chat-column-holder");
    docs = $("#docs");
    sender = $('#sender');
    login = $('#login');
  }

  function scrollToChatBottom(id, duration) {
    var div = document.getElementById(id);
    $(`#${id}`).animate({
      scrollTop: div.scrollHeight - div.clientHeight
    }, duration);
  }

  function send() {
    let pay = Api.getPayload("response");

    if ($("#textInput").val() != "") {
      return ConversationPanel.msgSend(pay.context)
    }
  }

  function setActions() {
    //chat_toggler.click(hideChat);
    docs_toggler.click(hideDocs);
    docs_insider.click(hideDocs);
    sender.click(send);
    //sugg_button.click(suggestion);

  }

  function toggleDropdown(clickedButton) {
    let dropmenu = $(clickedButton).parent().find(".dropdown-menu");
    dropmenu.toggleClass("show-block");
  }

  return {
    lock: lock,
    scrollToChatBottom: scrollToChatBottom,
    send: send,
    toggleDropdown: toggleDropdown,
    unlock: unlock
  }
})();
