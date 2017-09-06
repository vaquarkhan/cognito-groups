import React, { Component } from 'react';
import {getAwsCredentials, updateAwsCredentials, getCurrentUser, refreshSession, getTokens} from '../libs/awsLib';
import jwtDecode from 'jwt-decode';
import AWS from 'aws-sdk';

class Home extends Component {
    constructor(props) {
        super(props);

        this.state = {};
    }

    showCredentials = async (event) => {
        await getAwsCredentials(this.props.userToken);

        alert(AWS.config.credentials.accessKeyId);
        alert(AWS.config.credentials.secretAccessKey);
    }

    refreshToken = async (event) => {
        console.log("refresh user token");
        const currentUser = getCurrentUser();
        await refreshSession(currentUser, this.props.refreshToken);

        const tokens = await getTokens(currentUser);
        console.log(tokens.idToken);
        this.props.updateRefreshToken(tokens.refreshToken);
        this.props.updateUserToken(tokens.idToken);
        this.props.updateAccessToken(tokens.accessToken);
        console.log("user token updated");
    }

    callLambdaGetAwsRoleCred(userToken) {
        return new Promise((resolve, reject) => {
            var lambda = new AWS.Lambda();
            var params = {
                "FunctionName": "getAwsRoleCred-dev-getAwsRoleCred",
                "Payload": "{\"token\": \"" + this.props.userToken + "\"}",
            };
            var accessId = null;
            var secretKey = null;
            var sessionToken = null;

            var lambda_promise = lambda.invoke(params).promise();
            lambda_promise.then(function(data) {
                var result = JSON.parse(data.Payload);
                if(result.statusCode !== 200) {
                    const err = new Error("unable to elevate credentials");
                    reject(err);
                }
                console.log(result);
                accessId = result.body.accessKeyId;
                secretKey = result.body.secretAccessKey;
                sessionToken = result.body.sessionToken;
                resolve( {accessKeyId: accessId,
                    secretAccessKey: secretKey,
                    sessionToken: sessionToken});
            }).catch(function(err) {
                console.log(err);
                reject(err);
                return;
            });
        });
    }

    callLambdaAdminFcn() {
        return new Promise((resolve, reject) => {
            var lambda = new AWS.Lambda();
            var params = {
                "FunctionName": "getAwsRoleCred-dev-adminOnlyFcn",
                "Payload": "{\"token\": \"" + this.props.userToken + "\"}",
            };

            var lambda_promise = lambda.invoke(params).promise();
            lambda_promise.then(function(data) {
                var result = JSON.parse(data.Payload);
                resolve(result);
            }).catch(function(err) {
                console.log(err);
                reject(err);
                return;
            });
        });
    }

    getAdmin = async (event) => {
        await getAwsCredentials(this.props.userToken);

        console.log("call admin fcn");
        const result = await this.callLambdaAdminFcn();
        console.log(result);

    }

    getAdminElevated = async (event) => {
        await getAwsCredentials(this.props.userToken);

        const cred = await this.callLambdaGetAwsRoleCred(this.props.userToken);
        console.log(AWS.config.credentials.identityId);
        console.log(cred.accessKeyId);
        console.log(cred.secretAccessKey);
        console.log(cred.sessionToken);

        await updateAwsCredentials(cred.accessKeyId, cred.secretAccessKey, cred.sessionToken);

        const token = jwtDecode(this.props.userToken);
        console.log(token);

        console.log("call admin fcn");
        const result = await this.callLambdaAdminFcn();
        console.log(result);
    }

    getViewer = async (event) => {
        await getAwsCredentials(this.props.userToken);

        const s3 = new AWS.S3();

        var params = {
            Bucket: "rl-metrics-dashboard",
                Key: "boards/viewer.txt",
        };


        s3.getObject(params, function(err, data) {
            if (err) {
                console.log(err, err.stack);
            } else {
                console.log(data);
            }
        });
    }


    render() {
        return (
            <div className="Home">
                <div className="lander">
                    <h1>Home Page</h1>
                    <p>admin page for metrics dashboard</p>
                </div>
                <button onClick={this.showCredentials}>Show Cred</button>
                <button onClick={this.refreshToken}>Refresh User Token</button>
                <button onClick={this.getAdmin}>Call Admin Fcn</button>
                <button onClick={this.getAdminElevated}>Call Admin Fcn elevated</button>
                <button onClick={this.getViewer}>Get Viewer File</button>
            </div>
        );
    }
}

export default Home;