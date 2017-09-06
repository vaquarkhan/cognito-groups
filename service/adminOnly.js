'use strict';

const AWS = require("aws-sdk");
const fetch = require("node-fetch");
const jwt = require("jsonwebtoken");
const jwtToPem = require("jwk-to-pem");

var keys = {};
var sts = new AWS.STS();

module.exports.adminOnlyFcn = (event, context, callback) => {
      const pool_url = 'https://cognito-idp.' + process.env.REGION + '.amazonaws.com/' + process.env.USER_POOL_ID;
      fetch(pool_url + '/.well-known/jwks.json').then(function(res) {
        return res.json();
      }).then(function(json) {
        // store keys in PEM format
        for(var k in json.keys) {
          var kid = json.keys[k].kid;
          var modulus = json.keys[k].n;
          var exponent = json.keys[k].e;
          var key_type = json.keys[k].kty;
          var jwk = {kty: key_type, n: modulus, e: exponent};
          var pem = jwtToPem(jwk);
          keys[kid] = pem;
        }

        var token = event.token;

        var decoded = jwt.decode(token, {'complete': true});
        console.log(decoded);

        if(pool_url != decoded.payload.iss) {
          console.log("user pool mismatch");
          const response = {
            statusCode: 403,
            body: JSON.stringify({
              error: "user pool mismatch",
            }),
          };
          callback(null, response);
          return;
        }

        if('id' != decoded.payload.token_use) {
          console.log("need id token");
          const response = {
            statusCode: 403,
            body: JSON.stringify({
              error: "wrong type of token",
            }),
          };
          callback(null, response);
          return;
        }

        var payload = jwt.verify(token, keys[decoded.header.kid], { algorithms: [decoded.header.alg], issuer: pool_url });
        console.log(payload);

        callback(null, {message: "admin fcn called", account_id: payload['custom:account_id']});
        return;

    }).catch(err => {
        console.log(err);
        callback(err);
        return;
    });

};
