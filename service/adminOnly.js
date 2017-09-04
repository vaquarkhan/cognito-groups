'use strict';

const AWS = require("aws-sdk");

var keys = {};
var sts = new AWS.STS();

module.exports.adminOnlyFcn = (event, context, callback) => {

  callback(null, {message: "admin fcn called"});
};
