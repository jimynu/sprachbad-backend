const mongoose = require ('mongoose');
mongoose.Promise = global.Promise;

// const User = require('./models').User;
// const Lexeme = require('./models').Lexeme;


mongoose.connect('mongodb://localhost:27017/sprachbad', {
  useMongoClient: true,
});

const db = mongoose.connection;

db.on('error', error => {
  console.error( 'connection error', error);
});


db.once('open', error => {
  if( error ) console.error( 'DB connection failed', error );
  console.log( 'DB connection successful' );


  // var stuhl = new Lexeme({
  //   lexeme: 'Stuhl',
  // });



  // stuhl.save()
  //   .then(stuhl => {
  //     console.log('id stuhl');
  //     console.log(stuhl._id);
  //
  //     var matt = new User({
  //       name: 'Matt',
  //       lexemes: [{lexeme: stuhl._id}]
  //     });
  //
  //     matt.save()
  //       .then(stuhl => {
  //         console.log('id matt');
  //         console.log(matt);
  //       })
  //   })
  //
  //
  // User.findById( "5a1d397459763c7afe4be736" )
  //   .populate('lexeme')
  //   .then( data => console.log(data) );




});

module.exports = db;
