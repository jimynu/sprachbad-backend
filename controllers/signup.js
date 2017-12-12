const express = require('express');
const router = express.Router();

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const User = require('../models').User;
const BlacklistedIp = require('../models').BlacklistedIp;


router.post( '/', (req, res, next) => {

  BlacklistedIp.findOne({ip: req.ip})
    .then( (ip, error) => {

      if ( ip ) { // reset after 10min
        if ( Date.parse(ip.lastTry) + 600000 < Date.now() ) {
          ip.remove();
        } else {
          ip.saveTemp();
        }

        if ( ip.count >= 5 && Date.parse(ip.lastTry) + 600000 > Date.now() ) { // block for 10min
          let error = new Error('Too many attempts');
          error.status = 403;
          return next(error);
        }
      }

      if ( !ip ) {
        const newIp = new BlacklistedIp({ip: req.ip});
        newIp.save();
      }

      // check if username has no forbidden chars + consists of >=3 chars
      const desiredName = req.body.name;

      const forbiddenCharsInName = /[^A-Za-z]/;
      if ( forbiddenCharsInName.test(desiredName) || !/.{3,}/.test(desiredName) ) {
        let error = new Error('Username may only consist of letters and should have at least 3 characters');
        error.status = 406;
        return next(error);
      }


      // check if username is free
      User.findOne({name: req.body.name})
        .then( (user, error) => {

          if (user) {
            let error = new Error('Username already taken');
            error.status = 409;
            return next(error);
          }

          // check if pw has no forbidden chars + consists of >=6 chars
          const desiredPw = req.body.password;
          const forbiddenCharsInPw = /[^A-Za-z0-9-_]/;
          if ( forbiddenCharsInPw.test(desiredPw) || !/.{6,}/.test(desiredPw) ) {
            let error = new Error('Password may only consist of letters, numbers, dash, underscore and should have at least 6 characters');
            error.status = 406;
            return next(error);
          }

          // create user
          bcrypt.hash(desiredPw, 8)
            .then( pwHash => {
              const newUser = new User({
                name: desiredName,
                password: pwHash
              })

              newUser.save()
                .then( () => res.json(newUser) )
                .catch( error => next(error) );
            })
        })
        .catch( error => next(error) );
    })
    .catch( error => next(error) );
});


module.exports = router;
