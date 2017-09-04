import React from 'react';

export default ({ isLoading, text, loadingText, disabled = false, ...props}) => (
    <button disabled={isLoading} {...props}>
        {isLoading && <i className="fa fa-cog fa-spin fa-lg fa-fw"/>}
        {!isLoading ? text : loadingText}
    </button>
);