const mongoose = require ('mongoose');
mongoose.Promise = global.Promise;

require('dotenv').config();

mongoose.connect(`mongodb://${ process.env.DB_USER }:${ process.env.DB_PASS }@${ process.env.DB_HOST }`, {
  useMongoClient: true,
});

const db = mongoose.connection;

db.on('error', error => {
  console.error( 'connection error', error);
});


db.once('open', error => {
  if( error ) console.error( 'DB connection failed', error );
  console.log( 'DB connection successful' );
});

module.exports = db;
