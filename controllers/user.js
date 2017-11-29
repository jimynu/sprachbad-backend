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
  // mask data (only pass on qualifying values)
  const updateData = {};
  if ( req.body.level ) updateData.level = req.body.level;
  if ( req.body.newbie === false || req.body.newbie === true ) updateData.newbie = req.body.newbie;
  if ( req.body.name ) updateData.name = req.body.name;

  req.user.update( updateData, (error, result) => {
    if ( error ) return next(error);
    res.json(result);
  });
});



router.get( '/:id/lexemes', (req, res, next) => {
  User.findById( req.user._id ) // get again b/c in req.user the lexemes are stripped off
    .populate('lexemes.lexeme', 'lexeme')
    .then( ({ lexemes }) => res.json(lexemes) )
    .catch( error => next(error) );
});


router.put( '/:id/lexemes', (req, res, next) => {

  // move to models.js?
  User.findById( req.user._id )
    .then( ({ lexemes: oldLexemes }) => {

      // remove
      const lexemesFiltered = oldLexemes
        .filter( ({ lexeme: lexemeId}) => req.body.remove.indexOf(String(lexemeId)) === -1 );

      // add
      const lexemesToAdd = req.body.add
        .filter( lexemeId => oldLexemes.map( ({lexeme: id}) => String(id) ).indexOf(lexemeId) === -1 ) // filter out if already in lexeme list
        .map( lexeme => { return {lexeme} } );

      // persist in DB, deliver response
      req.user.update( { lexemes: [...lexemesFiltered, ...lexemesToAdd] }, (error, result) => {
        if ( error ) return next(error);
        res.json(result); // just "res.status(200).send()" ?
      });

    })
    .catch( error => next(error) );
});


router.get( '/:id/lexemes/:quantity', (req, res, next) => {
  User.findById( req.user._id )
    .populate('lexemes.lexeme')
    .then( ({ lexemes }) => {
      // select questions, later based on (1) level of control, (2) last learned
      return res.json(lexemes);
    })
    .catch( error => next(error) );
});


router.put( '/:id/lexemes/:lexemeId/:success', (req, res, next) => {
  User.findById( req.user._id )
    .then( user => {
      const lexeme = user.lexemes.filter( ({ lexeme: id }) => String(id) === req.params.lexemeId )[0];

      if(!lexeme) {
        const error = new Error( 'Lexeme not found' );
        error.status = 404;
        return next(error)
      }

      const success = req.params.success

      if (success.search(/^(correct|wrong)$/) === -1 ) {
        const error = new Error('Bad request');
        error.status = 400;
        return next(error);
      }

      if ( success === 'correct' ) lexeme.times_right++;
      if ( success === 'wrong' ) lexeme.times_wrong++;

      user.updateProgress(lexeme, (error, result) => {
        if ( error ) return next(error);
        res.json(result);
      });


    })
    .catch( error => next(error) );
});


module.exports = router;



router.delete( '/:id', (req, res, next) => {
  if ( req.params.id.search(/^(up|down)$/) === -1 ) {
    var err = new Error('only up or down, mate');
    err.status = 404;
    next(err);
  } else {
    next();
  }
}, (req, res) => {
  res.json({ hui: req.params.id });
});
