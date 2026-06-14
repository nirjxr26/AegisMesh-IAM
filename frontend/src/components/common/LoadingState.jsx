import React from 'react';
import PropTypes from 'prop-types';

export default function LoadingState({ message = 'Loading...' }) {
    return (
        <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-3 border-[#4f46e5] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-[#7a87a8]">{message}</p>
        </div>
    );
}

LoadingState.propTypes = {
    message: PropTypes.string,
};
