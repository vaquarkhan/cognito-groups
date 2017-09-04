import React, { Component } from 'react';
import { withRouter, Link } from 'react-router-dom';
import Routes from './Routes';
import RouteNavItem from './components/RouteNavItem';
import AWS from 'aws-sdk';
import {clearAwsCredentials, getCurrentUser, getTokens} from './libs/awsLib';
import config from './config.js';
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      userToken: null,
      refreshToken: null,
      isLoadingUserToken: true,
    };
  }

  updateUserToken = (userToken) => {
    this.setState({
      userToken: userToken
    });
  }

  updateRefreshToken = (refreshToken) => {
    this.setState({
      refreshToken: refreshToken
    });
  }

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
      console.log(tokens);
      this.updateUserToken(tokens.idToken);
      this.updateRefreshToken(tokens.refreshToken);
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

    this.props.history.push('/login');
  }

  render() {
    const childProps = {
      userToken: this.state.userToken,
      refreshToken: this.state.refreshToken,
      jwtKeys: this.state.jwtKeys,
      updateUserToken: this.updateUserToken,
      updateRefreshToken: this.updateRefreshToken,
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
          <Link className="navbar-brand" to="/">Cognito Admin Test</Link>
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
