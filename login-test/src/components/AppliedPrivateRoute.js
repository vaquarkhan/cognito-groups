import React from 'react';
import {Route, Redirect} from 'react-router-dom';

// helper to route based on whether user has a user token assigned to them or not

export default ({ component: C, props: cProps, ...rest }) => (
    <Route {...rest} render={ props => 
        cProps.userToken ? <C {...props} {...cProps} />
        : <Redirect to="/login" />
    } />
);