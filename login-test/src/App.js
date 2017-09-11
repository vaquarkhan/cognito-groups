import React, { Component } from 'react';
import { withRouter, Link } from 'react-router-dom';
import Routes from './Routes';
import RouteNavItem from './components/RouteNavItem';
import AWS from 'aws-sdk';
import {clearAwsCredentials, getCurrentUser, getTokens, testIsAdminUser} from './libs/awsLib';
import config from './config.js';
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      userToken: null,
      accessToken: null,
      refreshToken: null,
      isAdminUser: false,
      isLoadingUserToken: true,
    };
  }

  updateUserToken = (userToken) => {
    this.setState({
      userToken: userToken
    });
  }

  updateAccessToken = (accessToken) => {
    this.setState({
      accessToken: accessToken
    });
  }

  updateRefreshToken = (refreshToken) => {
    this.setState({
      refreshToken: refreshToken
    });
  }

  setIsAdminUser = (isAdminUser) => {
    this.setState({
      isAdminUser: isAdminUser
    });
  }


  // TODO:  need to factor out code that gets user token and keys so it can be called from multiple places.  needs to be called on login as well as componentDidMount
  async componentDidMount() {
      AWS.config.region = config.cognito.REGION;

    const currentUser = getCurrentUser();

    if(currentUser === null) {
      console.log("no current user");
      this.setState({isLoadingUserToken: false});
      return;
    }

    try {
      console.log("try to get tokens");
      const tokens = await getTokens(currentUser);
      console.log("id token:  " + tokens.idToken);
      console.log("access token:  " + tokens.accessToken);
      this.updateUserToken(tokens.idToken);
      this.updateAccessToken(tokens.accessToken);
      this.updateRefreshToken(tokens.refreshToken);
      const isAdminUser = testIsAdminUser(tokens.idToken, config.admin.admin_group);
      this.setIsAdminUser(isAdminUser);
    }
    catch(e) {
      if (e.code === "UserNotFoundException") {
        console.log("JDS user not found");
      } else {
        alert(e);
      }
    }

    this.setState({isLoadingUserToken: false});
  }

  handleNavLink = (event) => {
    event.preventDefault();
    this.props.history.push(event.currentTarget.getAttribute('href'));
  }

  handleLogout = (event) => {
    const currentUser = getCurrentUser();

    alert("about to signout");
    if(currentUser !== null) {
      alert("signout");
      currentUser.signOut();
      clearAwsCredentials();
    }
    this.updateUserToken(null);
    this.updateAccessToken(null);
    this.updateRefreshToken(null);
    this.setIsAdminUser(false);

    this.props.history.push('/login');
  }

  render() {
    const childProps = {
      userToken: this.state.userToken,
      refreshToken: this.state.refreshToken,
      isAdminUser: this.state.isAdminUser,
      updateUserToken: this.updateUserToken,
      updateAccessToken: this.updateAccessToken,
      updateRefreshToken: this.updateRefreshToken,
      setIsAdminUser: this.setIsAdminUser,
    };

    return ! this.state.isLoadingUserToken && (
      <div className="container-fluid">

      <nav className="navbar navbar-default">
        <div className="navbar-header">
          <button type="button" className="navbar-toggle collapsed" data-toggle="collapse" data-targets="#navbar-collapse-1" aria-expanded="false">
            <span className="sr-only">Toggle Navigation</span>
            <span className="icon-bar"></span>
            <span className="icon-bar"></span>
            <span className="icon-bar"></span>
          </button>
          <Link className="navbar-brand" to="/">Metrics Dashboard Admin</Link>
        </div>

        <div className="collapse navbar-collapse" id="navbar-collapse-1">
          <ul className="nav navbar-nav navbar-right">
          { this.state.userToken
            ? <li><a onClick={this.handleLogout} href="#" >Logout</a></li>
            : [<RouteNavItem key={1} onClick={this.handleNavLink} href="/signup">Signup</RouteNavItem>,
               <RouteNavItem key={2} onClick={this.handleNavLink} href="/login">Login</RouteNavItem> ]}
          </ul>
        </div>

      </nav>

      <Routes childProps={childProps} />

      </div>
    );
  }
}

export default withRouter(App);
