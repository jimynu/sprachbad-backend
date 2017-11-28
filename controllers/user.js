const express = require('express');
const router = express.Router();
const User = require('../models').User;
const Lexeme = require('../models').Lexeme;


// "id" parameter –> params
router.param( 'id', (req, res, next, id) => {
  User.findById( req.params.id, 'name newbie level' ) // "select" fields (+id)
    .then( user => {
      if ( !user ) {
        error = new Error( 'Not found' );
        error.status = 404;
        return next(error)
      }
      req.user = user;
      return next();
    })
    .catch( error => next(error) );
});



router.get( '/:id', (req, res, next) => {
  res.json(req.user);
});


router.put( '/:id', (req, res, next) => {
  req.user.update( req.body, (error, result) => {
    if ( error ) return next(error);
    res.json(result);
  });
});



router.get( '/:id/lexemes',
  (req, res, next) => {
    // get list of IDs of user's words
    User.findById( req.user._id )
      .then( user => {
        const ids = user.lexemes.map( lexeme => lexeme.lexeme_id )
        console.log(ids);
      })
      .catch( error => next(error) );
});


module.exports = router;
