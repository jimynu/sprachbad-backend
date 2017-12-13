const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('../models').User;
const Lexeme = require('../models').Lexeme;
const Token = require('../models').Token;


// check token
router.use( (req, res, next) => {
  const sentToken = req.headers.authorization.substring(7); // cut off "Bearer "
  jwt.verify(sentToken, process.env.JWT_SECRET, (err, {id: tokenUserId}) => {
    Token.findOne({ userId: tokenUserId })
      .then( (foundToken, error) => {
        if ( sentToken !== foundToken.token ) {
          error = new Error( 'Token invalid' );
          error.status = 401;
          return next(error)
        }
        req.tokenUserId = tokenUserId;
        return next();
      })
      .catch( error => next(error) );
  });
})


// "id" parameter –> params
router.param( 'id', (req, res, next, id) => {
  User.findById( req.tokenUserId, 'name newbie level' ) // "select" fields (+id) --- user id in URL path is ignored at this moment
    .then( user => {
      if ( !user ) {
        error = new Error( 'Not found' );
        error.status = 404; // 401?
        return next(error)
      }
      req.user = user;
      return next();
    })
    .catch( error => next(error) );
});



/*** ROUTES ***/

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
    .populate('lexemes.lexeme', 'lexeme tasks')
    .then( ({ lexemes }) => {
      // check which levels have tasks
      const lexemesWithTaskSummary = lexemes.map( lexeme => {
        const { tasks: lexTasks, lexeme: lexLexeme, _id: lexID } = lexeme.lexeme;
        const level10tasks = lexTasks.some( task => task.level === 10 );
        const level20tasks = lexTasks.some( task => task.level === 20 );
        const level30tasks = lexTasks.some( task => task.level === 30 );

        const { correctAnswers, wrongAnswers, progress, lastLearnt, _id } = lexeme;
        return { correctAnswers, wrongAnswers, progress, lastLearnt, _id, lexeme: {
          level10tasks,
          level20tasks,
          level30tasks,
          lexeme: lexLexeme,
          _id: lexID
        }};
      })
      res.json(lexemesWithTaskSummary)
    })
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

          const savedLexeme = result.lexemes.find( ({ lexeme: id }) => String(id) === lexemeIdToAdd );

          Lexeme.findById( lexemeIdToAdd )
            .then( foundLexeme => {
              const tasks = foundLexeme.tasks;
              const returnLexeme = {
                lexeme: {
                  lexeme: foundLexeme.lexeme,
                  level10tasks: tasks.some( task => task.level === 10 ),
                  level20tasks: tasks.some( task => task.level === 20 ),
                  level30tasks: tasks.some( task => task.level === 30 ),
                  _id: foundLexeme._id }, //or savedLexeme.lexeme (sic!)
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
          .filter( ({ lexeme: lexemeId}) => lexemeIdToRemove !== String(lexemeId) );

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
          return !!userLexeme.lexeme.tasks.find( task => task.level === req.user.level );
        })
        .map( userLexeme => {
          // select tasks: task level should fit user level
          const tasksFittingLevel = userLexeme.lexeme.tasks.filter( task => {
            return task.level === req.user.level;
          });

          // just one task –> randomise
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

      // shuffle (Fisher-Yates)
      let remaining = filteredLexemes.length, currentElement, randomElement;
      while (remaining) {
        randomElement = Math.floor(Math.random() * remaining--);
        currentElement = filteredLexemes[remaining];
        filteredLexemes[remaining] = filteredLexemes[randomElement];
        filteredLexemes[randomElement] = currentElement;
      }

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
