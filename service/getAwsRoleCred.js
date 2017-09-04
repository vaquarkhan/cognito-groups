'use strict';

/*
  varify token
  look for 'cognito:groups' in the token payload
  lookup group in group => role mapping
    process.env['group name'] to get ARN
  get temp credentials for IAM group listed

*/

const AWS = require("aws-sdk");
const fetch = require("node-fetch");
const jwt = require("jsonwebtoken");
const jwtToPem = require("jwk-to-pem");

var keys = {};
var sts = new AWS.STS();

module.exports.getAwsRoleCred = (event, context, callback) => {
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

    // verify token
    var token = event.token;

    var decoded = jwt.decode(token, {'complete': true});
    //console.log(decoded);

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
    //console.log(payload);

    if(!('cognito:groups' in payload)) {
      console.log("no groups");
      const response = {
        statusCode: 403,
        body: JSON.stringify({
          error: "no groups",
        }),
      };
      callback(null, response);
      return;
    }

    var params = {
      DurationSeconds: 900,
      RoleArn: process.env[payload['cognito:groups'][0]],
      RoleSessionName: decoded.payload.sub
    };

    //console.log(params);

    sts.assumeRole(params, function(err, data) {
      if(err) {
        console.log(err);
        callback(err);
      } else {
        const response = {
          statusCode: 200,
          body: {
            accessKeyId: data.Credentials.AccessKeyId,
            secretAccessKey: data.Credentials.SecretAccessKey,
            sessionToken: data.Credentials.SessionToken
          }
        }

        callback(null, response);
      }
    });
  }).catch(err => {
    console.log(err);
    callback(err);
  });

};
