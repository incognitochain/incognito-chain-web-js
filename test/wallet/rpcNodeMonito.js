const axios = require("axios")

const CancelToken = axios.CancelToken;
const HEADERS = {'Content-Type': 'application/json'};
const TIMEOUT = 45000;
const sources = {};

const CANCEL_MESSAGE = 'Request cancelled';

const CANCEL_KEY = 'cancelPrevious';

let currentAccessToken = '';

const instance = axios.create({
    baseURL: 'https://monitor.incognito.org/',
    timeout: TIMEOUT,
    headers: {
        ...HEADERS,
        Authorization: '',
    },
});

// Add a request interceptor
instance.interceptors.request.use(
    config => {
        const newConfig = {
            ...config,
            headers: {
                ...config.headers,
                Authorization: 'Bearer ' + currentAccessToken,
            }
        };

        const path = config.url;
        if (path.includes(CANCEL_KEY)) {
            if (sources[path]) {
                sources[path].cancel(CANCEL_MESSAGE);
            }

            sources[path] = CancelToken.source();
            newConfig.cancelToken = sources[path].token;
        }
        return newConfig;
    },
    error => {
        return Promise.reject(error);
    },
);

instance.interceptors.response.use(
    res => {
        const result = res?.data;
        return Promise.resolve(result);
    },
    errorData => {
        return Promise.reject(errorData);
    },
);

module.exports = ({ instance });