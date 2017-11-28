const express = require('express');
const router = express.Router();
const Lexeme = require('../models').Lexeme;


// "id" parameter –> params
router.param( 'id', (req, res, next, id) => {
  Lexeme.findById( req.params.id, (error, lexeme) => {
    if ( error ) return next(error);
    if ( !lexeme ) {
      error = new Error( 'Not found' );
      error.status = 404;
      return next(error)
    }
    req.lexeme = lexeme;
    return next();
  });
});


// get all lexemes (for now), full data (–> editing)
router.get( '/', (req, res, next) => {
  Lexeme.find({})
    .then( lexemes => res.json(lexemes) )
    .catch( error => next(error) );
});


// get all lexemes (for now), just lexeme + id (–> selecting)
router.get( '/summary', (req, res, next) => {
  Lexeme.find({}, 'lexeme' ) // get only "lexeme" field and "id" (always there)
    .then( lexemes => res.json(lexemes) )
    .catch( error => next(error) );
});


// get lexeme by ID
router.get( '/:id', (req, res, next) => {
  res.json(req.lexeme);
});


// submit new lexeme
router.post( '/',
  (req, res, next) => {
    if ( !req.body.lexeme ) {
      const err = new Error( 'No lexeme provided.' );
      err.status = 400;
      next(err);
    } else next();
  },

  (req, res, next) => {
    Lexeme.find({ lexeme: req.body.lexeme })
      .then( ( records ) => {
        if ( records.length !== 0 ) {
          const err = new Error( 'Lexeme already exists.' );
          err.status = 409;
          next(err);
        } else next();
      })
      .catch( error => next(error) );
  },

  (req, res, next) => {

    const { lexeme, tasks } = req.body;
    const newLexeme = new Lexeme({ lexeme, tasks })

    newLexeme.save()
      .then( () => res.json(newLexeme) )
      .catch( error => next(error) );
  }
);


// change lexeme by ID
router.put( '/:id', (req, res, next) => {
  req.lexeme.update(req.body, (error, result) => {
    if ( error ) return next(error);
    res.json(result);
  });
});


module.exports = router;
