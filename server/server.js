const basicAuth = require('express-basic-auth')
const express = require("express");
// import the SQLite DB that you use
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(process.env.DB_URL);
// Import the package
const { SqliteGuiNodeMiddleware } = require("sqlite-gui-node");

const app = express();
app.use(basicAuth({
    users: {'admin': process.env.ADMIN_PASSWORD},
    challenge: true
}))
app.use(SqliteGuiNodeMiddleware(app, db));

const port = process.env.PORT || 4000;
app.listen(port);
console.log('Listening on ', port, ' watching db at ', process.env.DB_URL)