const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cors = require('cors');
const speakeasy = require('speakeasy');
const request = require('request')



const app = express();
const PORT = process.env.PORT || 8080;


// // import Routes
const authRoute = require('./routes/auth');
const childroute = require('./routes/child');
const mpesaroute = require ('./routes/mpesa');
const depositroute = require('./routes/deposit');
const setlimit = require ('./routes/setlimit');
const send_money = require ('./routes/send_money');
const paybill = require ('./routes/paybill');
const buygoods = require ('./routes/buygoods');
const buyAirtime = require ('./routes/buyAirtime')
const request_payment = require ('./routes/request');
const budget = require ('./routes/setbudget')
const bond = require ('./routes/bonds')
const view = require ('./routes/view')





app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());

// // Route middleware
app.use('/api/user' ,authRoute);
app.use('/api/child' , childroute)
app.use('/api/mpesa' ,mpesaroute)
app.use('/api' ,depositroute)
app.use('/api' ,setlimit)
app.use('/api' ,send_money )
app.use('/api' , paybill)
app.use('/api' , buygoods)
app.use('/api' , buyAirtime)
app.use('/api',request_payment)
app.use('/api' , budget)
app.use('/api' , bond)
app.use('/view' , view)



// Define your routes here

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));


