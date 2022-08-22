import fetchAdapter from "@vespaiach/axios-fetch-adapter";
const axios = require("axios");
class RPCHttpService {
  constructor(url = "http://localhost:9334", username, password) {
    this.auth = {
      username: username,
      password: password,
    };
    this.url = url;
    this.axios = axios;
  }

  async postRequest(data) {
    // console.log("RPC request data is", JSON.stringify(data));

    let response;
    try {
      response = await this.axios.post(this.url, data, {
        auth: this.auth,
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          "Access-Control-Allow-Headers":
            "Content-Type, Cache-Control, X-Requested-With, X-CSRF-Token, Discourse-Visible, User-Api-Key, User-Api-Client-Id, *",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, PUT, GET, OPTIONS, DELETE",
        },

        adapter: fetchAdapter,
      });
    } catch (error) {
      response = error;
    }

    return response;
  }
}

export { RPCHttpService };
