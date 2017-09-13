import React from 'react';
import {Route, Redirect} from 'react-router-dom';

// helper to route based on whether user is admin user
// additional conditional terms can be added as necessary

export default ({ component: C, props: cProps, ...rest }) => (
    <Route {...rest} render={ props => 
        cProps.isAdminUser ? <C {...props} {...cProps} />
        : <Redirect to="/login" />
    } />
);