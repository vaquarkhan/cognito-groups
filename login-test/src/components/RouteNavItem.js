import React from 'react';
import {Route} from 'react-router-dom';

export default (props) => (
    <Route path={props.href} exact children={({ match }) => (
        <li className={ match ? 'active' : '' }><a {...props}>{props.children}</a></li>
    )}/>
);