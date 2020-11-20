
const server = {
  root: "./public"
}

module.exports = {
  server: server,

  ASSISTANT_ID: process.env.ASSISTANT_ID,
  IBM_API_KEY: process.env.IBM_API_KEY,
  IBM_API_VERSION: process.env.IBM_API_VERSION,

  DEFAULT_PORT: process.env.DEFAULT_PORT,
  CURRENT_PORT: process.env.CURRENT_PORT,

  MYSQL: {
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USER,
    password: DATABASE_PASSWORD,
    database: DATABASE_NAME
  }
}
