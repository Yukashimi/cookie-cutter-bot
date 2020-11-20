
let util = (() => {
  function disabled() {
    return () => { };
  }

  function fixDisplay(date) {
    date = parseInt(date, 10);
    return (date < 10 ? ("0" + date) : date);
  }

  function inputOnEnter(event, callback) {
    if (event.keyCode === 13 && event.target.value) {
      callback();
    }
  }

  function now() {
    const now = new Date();
    return fixDisplay(now.getHours()) + ":" + fixDisplay(now.getMinutes()) + ":" + fixDisplay(now.getSeconds());
  }


  function today() {
    const today = new Date();
    return today.getFullYear() + "-" + fixDisplay(today.getMonth() + 1) + "-" + fixDisplay(today.getDate());
  }

  return {
    disabled: disabled,
    inputOnEnter: inputOnEnter,
    now: now,
    today: today
  }
})();

