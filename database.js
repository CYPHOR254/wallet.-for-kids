const express = require("express")
const app = express()
const mysql = require('mysql2');



const connection = mysql.createPool({
  connectionLimit: 100,
  host: "127.0.0.1",       //This is your localhost IP
  user: "root",         // "newuser" created in Step 1(e)
  password: "!asapmysql+2enen#",  // password for the new user
  database: "userDB",      // Database name
  port: "3306",          // port name, "3306" by default
  
});
connection.getConnection( (err, connection)=> {
  if (err) throw (err)
  console.log ("DB connected successful: " + connection.threadId)
});

module.exports = connection;
