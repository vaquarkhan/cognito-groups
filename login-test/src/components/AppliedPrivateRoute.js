import React from 'react';
import {Route, Redirect} from 'react-router-dom';

// this seems overly complicated but convenient:
// first check if boardid present in URL
// if not then redirect to login.
// next check if there is a usertoken.  if not, redirect to login
// so this trivially goes to login if you type in a different boardid than
// yours.  and you have to be logged in.  and logged in to see the right url
// there would be a server error anyway if you tried to make server requests
// on another user
export default ({ component: C, props: cProps, ...rest }) => (
    <Route {...rest} render={ props => 
        props.match.params.boardid ?
        cProps.userToken ? <C {...props} {...cProps} />
        : <Redirect to="/login" />
        : <Redirect to="/login" />
    } />
);