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
  if ( [10, 20, 30].indexOf(level) !== -1 ) updateData.level = level;
  if ( typeof newbie === "boolean" ) updateData.newbie = newbie;
  if ( name ) updateData.name = name;

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


router.put( '/:id/lexemes/add/:lexemeId', (req, res, next) => {

  const lexemeIdToAdd = req.params.lexemeId;

  User.findById( req.user._id )
    .then( user => {
      const lexeme = user.lexemes.find( ({ lexeme: id }) => String(id) === lexemeIdToAdd );

      if(lexeme) {
        const err = new Error( 'Lexeme is already in learning list.' );
        err.status = 409;
        return next(err);
      }

      if(!lexeme) {
        req.user.update( { lexemes: [...user.lexemes, { lexeme: lexemeIdToAdd }] }, (error, result) => {
          if ( error ) return next(error);

          let savedLexeme = result.lexemes.find( ({ lexeme: id }) => String(id) === lexemeIdToAdd );

          Lexeme.findById( lexemeIdToAdd )
            .then( foundLexeme => {
              const returnLexeme = {
                lexeme: {
                  lexeme: foundLexeme.lexeme,
                  _id: foundLexeme._id },
                _id: savedLexeme._id,
                progress: 1,
                wrongAnswers: 0,
                correctAnswers: 0
                };

              res.json(returnLexeme)
            })
            .catch( error => next(error) );
        });
      }
    })
    .catch( error => next(error) );
});


router.put( '/:id/lexemes/remove/:lexemeId', (req, res, next) => {

  const lexemeIdToRemove = req.params.lexemeId;

  User.findById( req.user._id )
    .then( user => {
      const lexeme = user.lexemes.find( ({ lexeme: id }) => String(id) === lexemeIdToRemove );

      if(!lexeme) {
        const err = new Error( 'Lexeme is not in learning list.' );
        err.status = 409;
        return next(err);
      }

      if(lexeme) {
        const lexemesFiltered = user.lexemes
          .filter( ({ lexeme: lexemeId}) => lexemeIdToRemove.indexOf(String(lexemeId)) === -1 );

        req.user.update( { lexemes: [...lexemesFiltered] }, (error, result) => {
          if ( error ) return next(error);
          res.json(lexemeIdToRemove);
        });
      }
    })
    .catch( error => next(error) );
});


// batch add/remove -- body syntax: { add: [...ids], remove: [...ids] }
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
        res.json(result); // unpopulated! just "res.status(200).send()" ?
      });

    })
    .catch( error => next(error) );
});




router.get( '/:id/lexemes/:quantity', (req, res, next) => {
  User.findById( req.user._id )
    .populate('lexemes.lexeme')
    .then( ({ lexemes }) => {
      // select questions, later based on (1) level of control, (2) last learned

      const filteredLexemes = lexemes
        .filter( userLexeme => { // check if there is at least 1 task for requested level
          return userLexeme.lexeme.tasks.find( task => task.level === req.user.level ) !== undefined;
        })
        .map( userLexeme => {
          // select tasks: (1) task level should fit user level
          const tasksFittingLevel = userLexeme.lexeme.tasks.filter( task => {
            return task.level === req.user.level;
          });

          // just one task –> randomise (for now)
          const randomNo = Math.floor( Math.random() * tasksFittingLevel.length );
          const task = tasksFittingLevel[randomNo];

          if ( !task.a ) task.a = userLexeme.lexeme.lexeme;

          // return new object
          return {
            lexemeId: userLexeme.lexeme._id,
            lexeme: userLexeme.lexeme.lexeme,
            task: task,
            correctAnswers: userLexeme.correctAnswers,
            wrongAnswers: userLexeme.wrongAnswers,
          };
      });

      return res.json(filteredLexemes);
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
