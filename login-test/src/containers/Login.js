import React, {Component} from 'react';
import {withRouter} from 'react-router-dom';
import {CognitoUserPool, AuthenticationDetails, CognitoUser} from 'amazon-cognito-identity-js';
import {testIsAdminUser} from '../libs/awsLib';
import config from '../config.js';
import LoaderButton from '../components/LoaderButton';

class Login extends Component {
    constructor(props) {
        super(props);

        this.state = {
            username: '',
            password: '',
            isLoading: false,
        };
    }

    validateForm() {
        return this.state.username.length > 0
            && this.state.password.length > 0;
    }

    handleChange = (event) => {
        this.setState({
            [event.target.id]: event.target.value
        });
    }

    handleSubmit = async (event) => {
        event.preventDefault();

        this.setState({ isLoading: true });

        try {
            const tokens = await this.login(this.state.username, this.state.password);
            console.log("usertoken from login");
            console.log(tokens.idToken);
            const isAdminUser = testIsAdminUser(tokens.idToken, config.admin.admin_group);
            this.props.setIsAdminUser(isAdminUser);
            this.props.updateUserToken(tokens.idToken);
            this.props.updateAccessToken(tokens.accessToken);
            this.props.updateRefreshToken(tokens.refreshToken);

            // NOTE:  may want to route differently here based on isAdminUser
            this.props.history.push('/');
        }
        catch(e) {
            alert(e);
            this.setState({isLoading: false});
        }
    }

    login(username, password) {
        const userPool = new CognitoUserPool({
            UserPoolId: config.cognito.USER_POOL_ID,
            ClientId: config.cognito.APP_CLIENT_ID,
        });
        const authenticationData = {
            Username: username,
            Password: password,
        };

        const user = new CognitoUser({Username: username, Pool: userPool});
        const authenticationDetails = new AuthenticationDetails(authenticationData);

        return new Promise((resolve, reject) => (
            user.authenticateUser(authenticationDetails, {
                onSuccess: (result) => resolve({
                    idToken: result.getIdToken().getJwtToken(),
                    accessToken: result.getAccessToken().getJwtToken(),
                    refreshToken: result.getRefreshToken().getToken()
                }),
                onFailure: (err) => reject(err),
            })
        ));
    }

    render() {
        return (
            <div>
                <form className="form-horizontal" onSubmit={this.handleSubmit}>
                    <div className="form-group">
                        <label className="col-sm-1">Email</label>
                        <div className="col-sm-4">
                            <input type="email" autoFocus className="form-control" id="username" placeholder="Email" value={this.state.username} onChange={this.handleChange}/>
                        </div>
                        <div className="col-sm-7"/>
                    </div>
                    <div className="form-group">
                        <label className="col-sm-1">Password</label>
                        <div className="col-sm-4">
                            <input type="password" className="form-control" id="password" placeholder="Password" value={this.state.password} onChange={this.handleChange}/>
                        </div>
                        <div className="col-sm-7"/>
                    </div>
                    <div className="form-group">
                        <div className="col-sm-1"/>
                        <div className="col-sm-4">
                        <LoaderButton className="btn btn-primary btn-lg btn-block" disabled={!this.validateForm()} type="submit" isLoading={this.state.isLoading} text="Login" loadingText="Logging in..."/>
                        </div>
                        <div className="col-sm-7"/>
                    </div>
                </form>
            </div>
        );
    }
}

export default withRouter(Login);