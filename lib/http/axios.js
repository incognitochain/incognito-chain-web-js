import axios from "axios";
// import { cachePromise, getCache, clearCache } from "@lib/utils/cache";
// import { v4 } from "uuid";

const TIMEOUT = 1e9;

const createAxiosInstance = ({ baseURL = "", token = "" } = {}) => {
  const instance = axios.create({
    baseURL,
    timeout: TIMEOUT,
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      "Access-Control-Allow-Headers":
        "Content-Type, Cache-Control, X-Requested-With, X-CSRF-Token, Discourse-Visible, User-Api-Key, User-Api-Client-Id, *",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, PUT, GET, OPTIONS, DELETE",
      Authorization: "Bearer " + token,
    },
  });

  // const getToken = () =>
  //   cachePromise(
  //     baseURL,
  //     () => {
  //       const uniqueId = v4();
  //       return instance
  //         .post("auth/new-token", {
  //           DeviceID: uniqueId,
  //           DeviceToken: uniqueId,
  //         })
  //         .then((response) => response?.Token)
  //         .catch((err) => err);
  //     },
  //     1e9
  //   );

  instance.interceptors.request.use(
    (req) => {
      req.headers = {
        ...req.headers,
      };
      return req;
    },
    (error) => {
      Promise.reject(error);
    }
  );

  instance.interceptors.response.use(
    (res) => {
      const result = res?.data?.Result;
      const error = res?.data?.Error;
      if (error) {
        return Promise.reject(error);
      }
      return Promise.resolve(result);
    },
    (error) => {
      // Unauthorized
      // if (error.config && error.response && error.response.status === 401) {
      //   clearCache(baseURL);
      //   return getToken()
      //     .then((authToken) => {
      //       if (authToken) {
      //         error.config.headers.Authorization = `Bearer ${authToken}`;
      //       }
      //       return instance.request(error.config);
      //     })
      //     .catch((err) => console.log("GET AUTH TOKEN ERROR", err));
      // }
      const errResponse = error?.response?.data?.Error || error?.response;
      let errorPayload = {
        name: "API_ERROR",
        code: error?.response?.status || 400,
        error: errResponse,
      };
      // can not get response, alert to user
      if (error?.isAxiosError && !errResponse) {
        errorPayload.error = "Send request RPC failed!";
      }
      return Promise.reject(errorPayload);
    }
  );

  return instance;
};

export default createAxiosInstance;
