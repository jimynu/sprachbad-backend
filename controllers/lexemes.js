const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('../models').User;
const Role = require('../models').Role;
const Lexeme = require('../models').Lexeme;
const Token = require('../models').Token;


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



// get all lexemes (for now), just lexeme + id (–> selecting)
router.get( '/summary', (req, res, next) => {
  Lexeme.find({}, 'lexeme tasks' ) // get only "lexeme" field and "id" (always there)
    .then( ( lexemes ) => {
      // check which levels have tasks
      const lexemesWithTaskSummary = lexemes.map( lexeme => {
        const { tasks: lexTasks, lexeme: lexLexeme, _id: lexID } = lexeme;
        const level10tasks = lexTasks.some( task => task.level === 10 );
        const level20tasks = lexTasks.some( task => task.level === 20 );
        const level30tasks = lexTasks.some( task => task.level === 30 );

        return {
          level10tasks,
          level20tasks,
          level30tasks,
          lexeme: lexLexeme,
          _id: lexID
        };
      })
      res.json(lexemesWithTaskSummary)
    })
    .catch( error => next(error) );
});


// get lexeme by ID
router.get( '/:id', (req, res, next) => {
  res.json(req.lexeme);
});




/*** ROUTES BELOW NEED ADMIN ACCESS ***/

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
        Role.findOne({ userId: tokenUserId })
          .then( ( role, error ) => {
            if ( !role || role.role !== 'admin' ) {
              error = new Error( 'Admin privileges needed' );
              error.status = 401;
              return next(error)
            }

            return next();
          })
          .catch( error => next(error) );
      })
      .catch( error => next(error) );
  });
})

// get all lexemes, full data (–> editing)
router.get( '/', (req, res, next) => {
  Lexeme.find({})
    .then( lexemes => res.json(lexemes) )
    .catch( error => next(error) );
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
