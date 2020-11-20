
let Api = (() => {
  let payload = {
    request: null,
    response: null
  };

  let messageEndpoint = '/api/message';

  function sendRequest(text, context, altAction) {
    let payloadToWatson = {
      context: context,
      input: {
        text: text,
        options: {
          'return_context': true
        }
      }
    };

    const tempId = sessionStorage.getItem("watson_session");
    if (tempId && tempId !== "undefined") {
      payloadToWatson.watson_session = JSON.parse(tempId);
    }

    let params = JSON.stringify(payloadToWatson);
    if (Object.getOwnPropertyNames(payloadToWatson).length !== 0) {
      Api.setPayload("request", params, true);
    }
    http.request.setOptions("POST", messageEndpoint);
    http.request.call(altAction || setRes, params);
  }

  function setRes(xhttp) {
    return () => {
      const tempId = (JSON.parse(xhttp.response)).session_id;
      Api.setPayload("response", xhttp.responseText, false);
      sessionStorage.setItem("watson_session", JSON.stringify(tempId));
    }
  }

  function getPayload(kind) {
    return payload[kind];
  }

  function setPayload(kind, value) {
    payload[kind] = JSON.parse(value);
  }

  return {
    sendRequest: sendRequest,

    getPayload: getPayload,
    setPayload: setPayload
  }
})();
