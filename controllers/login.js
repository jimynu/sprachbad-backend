const express = require('express');
const router = express.Router();

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models').User;
const Token = require('../models').Token;


router.post( '/', (req, res, next) => {
  User.findOne({name: req.body.name})
    .then( (user, error) => {

      if (!user) {
        let error = new Error('User not found');
        error.status = 401;
        return next(error);
      }

      bcrypt.compare( req.body.password, user.password, (error, result) => {
        if (!result) {
          let error = new Error('Wrong password');
          error.status = 401;
          return next(error);
        }

        // user/pw are correct -> is there a token yet?
        Token.findOne({ userId: user._id })
          .then( tokenFromDB => {

            if ( !tokenFromDB ) { // no token yet
              const token = jwt.sign({name: req.body.name, id: user._id}, process.env.JWT_SECRET, { expiresIn: '1 day' });
              const newToken = new Token({ userId: user._id, token });
              newToken.save();

              // return new token
              res.json({
                _id: user._id,
                name: user.name,
                newbie: user.newbie,
                level: user.level,
                token,
              });
              return;
            }

            // found token in DB –> check if still valid
            const oldToken = tokenFromDB.token;
            jwt.verify(oldToken, process.env.JWT_SECRET, (err) => {
              if ( err ) { // token expired –> generate new one + update DB
                const token = jwt.sign({name: req.body.name, id: user._id}, process.env.JWT_SECRET, { expiresIn: '1 day' });
                tokenFromDB.replace(token);

                // return new token
                res.json({
                  _id: user._id,
                  name: user.name,
                  newbie: user.newbie,
                  level: user.level,
                  token,
                });
                return;
              }

              // token in DB still valid –> return existing token
              res.json({
                _id: user._id,
                name: user.name,
                newbie: user.newbie,
                level: user.level,
                token: oldToken,
              });

            })
          })
          .catch( error => next(error) );
      });
    })
    .catch( error => next(error) );
});


module.exports = router;
