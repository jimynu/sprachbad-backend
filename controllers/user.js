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
  // mask data
  const { level, newbie, name } = req.body;
  const updateData = {};

  // only pass on qualifying values
  if ( [10, 20, 30].indexOf(updateData.level) !== -1 ) updateData.level = level;
  if ( typeof updateData.newbie === "boolean" ) updateData.newbie = newbie;
  if ( updateData.name ) updateData.name = name;

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

  User.findById( req.user._id )
    .then( ({ lexemes: oldLexemes }) => {

      // remove
      const lexemesFiltered = oldLexemes
        .filter( ({ lexeme: lexemeId}) => req.body.remove.indexOf(String(lexemeId)) === -1 );

      // add
      const lexemesToAdd = req.body.add
        .filter( lexemeId => oldLexemes.map( ({lexeme: id}) => String(id) ).indexOf(lexemeId) === -1 ) // filter out if already in lexeme list
        .map( lexeme => ({lexeme}) );

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
      const lexeme = user.lexemes.find( ({ lexeme: id }) => String(id) === req.params.lexemeId );

      if(!lexeme) {
        const error = new Error( 'Lexeme not found' );
        error.status = 404;
        return next(error)
      }

      const success = req.params.success;
      if (success.search(/^(correct|wrong)$/) === -1 ) {
        const error = new Error('Bad request');
        error.status = 400;
        return next(error);
      }

      if (success === 'correct') {
        lexeme.correctAnswers++;
        lexeme.progress++;
      } else if (success === 'wrong' ) {
        lexeme.wrongAnswers++;
        lexeme.progress /= 2;
      }

      user.updateProgress(lexeme, (error, result) => {
        if ( error ) return next(error);
        res.json(result);
      });
    })
    .catch( error => next(error) );
});


module.exports = router;
