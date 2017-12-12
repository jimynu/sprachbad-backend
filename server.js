const express = require('express');
const logger = require('morgan');
const cors = require('cors');
const jsonParser = require('body-parser').json;

const signupRoutes = require('./controllers/signup');
const loginRoutes = require('./controllers/login');
const lexemeRoutes = require('./controllers/lexemes');
const userRoutes = require('./controllers/user');
const db = require('./db');

const app = express();
const port = process.env.PORT || 3030;

const expressJWT = require('express-jwt');
const jwt = require('jsonwebtoken');
const User = require('./models').User;
const Token = require('./models').Token;
const bcrypt = require('bcryptjs');
require('dotenv').config();


app.listen( port, () => console.log(`${Date()}
Listening on port ${port}.`) );

app.use( cors() ); // permits all requests
app.enable('trust proxy'); // trusts the heroku proxy and saves origin ip in req.ip

app.use( logger('dev') );
app.use( jsonParser() );
app.use( expressJWT({ secret: process.env.JWT_SECRET }).unless({path: ['/api/login', '/api/signup', '/api/lexemes/summary']}) );

app.use ( '/api/signup', signupRoutes );
app.use ( '/api/login', loginRoutes );
app.use ( '/api/lexemes', lexemeRoutes );
app.use ( '/api/user', userRoutes );



// catch 404
app.use( (req, res, next) => {
  const err = new Error('Not found');
  err.status = 404;
  next(err);
});

// error handler
app.use( ( err, req, res, next ) => {
  res.status(err.status || 500);
  res.json({
    error: {
      message: err.message
    }
  });
});
