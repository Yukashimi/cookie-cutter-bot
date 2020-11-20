const config = require("./config.js");

const redirects = {
  bot: (req, res) => {
    res.sendFile("./bot.html", { root: config.server.root });
  }
}

module.exports = {
  redirects: redirects
}