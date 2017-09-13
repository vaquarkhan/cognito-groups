import AWS from 'aws-sdk';
import {CognitoUserPool} from 'amazon-cognito-identity-js';
import jwtDecode from 'jwt-decode';
import config from '../config.js';

export function getAwsCredentials(userToken) {
    if(null == userToken) {
        // see if the identity pool has default/unauthenticated credentials

        AWS.config.region = config.cognito.REGION;
        AWS.config.credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: config.cognito.IDENTITY_POOL_ID,
        });

        return AWS.config.credentials.getPromise();
    }

    /*
    if (AWS.config.credentials && Date.now() < AWS.config.credentials.expireTime - 60000) {
        alert("early return");
        return;
    }
    */

    const authenticator = 'cognito-idp.' + config.cognito.REGION + '.amazonaws.com/' + config.cognito.USER_POOL_ID;
    AWS.config.update({ region: config.cognito.REGION });

    var loginProvider = {};
    loginProvider[authenticator] = userToken;

    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: config.cognito.IDENTITY_POOL_ID,
        Logins: loginProvider,
    });

    return AWS.config.credentials.getPromise();
}

export function updateAwsCredentials(accessKeyId, secretKey, sessionToken) {
    const aws_cred = new AWS.Credentials(accessKeyId, secretKey, sessionToken);
    AWS.config.credentials = aws_cred;

    return AWS.config.credentials.getPromise();
}

export function getCurrentUser() {
    const userPool = new CognitoUserPool({
      UserPoolId: config.cognito.USER_POOL_ID,
      ClientId: config.cognito.APP_CLIENT_ID,
    });
    return userPool.getCurrentUser();
}

export function getTokens(currentUser) {
    return new Promise((resolve, reject) => {
        currentUser.getSession(function(err, session) {
            if(err) {
                reject(err);
                return;
            }
            resolve({
                idToken: session.getIdToken().getJwtToken(),
                accessToken: session.getAccessToken().getJwtToken(),
                refreshToken: session.getRefreshToken()
            });
        });
    });
}

export function refreshSession(currentUser, refreshToken) {
    return new Promise((resolve, reject) => {
        currentUser.refreshSession(refreshToken, (err, session) => {
            console.log("session refreshed");
            resolve();
        });
    });
}

export function refreshToken() {
    AWS.config.credentials.refresh((error) => {
        if (error) {
            console.error(error);
        } else {
            console.log('Successfully logged!');
        }
    });
}

export function clearAwsCredentials() {
    AWS.config.update({ region: config.cognito.REGION });

    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: config.cognito.IDENTITY_POOL_ID,
    });
    AWS.config.credentials.clearCachedId();
}

export function testIsAdminUser(userToken, admin_group) {
    if(null == userToken) {
        return false;
    }

    const token = jwtDecode(userToken);
    if('cognito:groups' in token) {
        if(token['cognito:groups'][0] === admin_group) {
            return true;
        }
    }

    return false;
}