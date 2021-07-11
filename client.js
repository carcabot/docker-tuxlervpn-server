var WebSocket = require("ws");

const PORT_START = 1701;
const PORT_STEP = 9001;
const CMD_SET_PROXY = "SET_PROXY";
const CMD_UNSET_PROXY = "UNSET_PROXY";
const CMD_GET_LOCAL_PROXY_ADDRESS = "getLocalProxyAddress";
const CMD_CHANGE_IP_COUNTRY_CITY = "changeIPCountryCity";
const CMD_CHANGE_IP_COUNTRY_CITY_NEW = "changeIPCountryCityNew";
let ports_web_sockets = [];
let appConnection;
let interval_;

function ParseMessage(message, ret) {
  // console.log("ParseMessage: ", message, ret);
  var matches;
  var rgx = /<message>([\s\S]*)(<details>)([\s\S]*)(<\/details>)<\/message>/gm;

  if ((matches = rgx.exec(message)) !== null) {
    ret.message = matches[1];
    ret.details = matches[3];
    return true;
  }

  return false;
}

function gotMessageApp(m) {
  NewMessageApp(m);
}

function NewMessageApp(msg) {
  console.log("NewMessageApp: ", JSON.stringify(msg));
  var json;

  switch (msg.message) {
    case "YOUR_IP":
      App.setProxy();
      setTimeout(function () {
        App.changeIPCountryCityNew("any", "Any", false, true);
      }, 1500);
      break;
  }
}

function AppConnection(address, onclose, onsuccess, inst_id) {
  this.address = address;
  this.ws = new WebSocket(this.address);
  this.onclose_callback = onclose;
  this.onsuccess_callback = onsuccess;
  this.inst_id = inst_id;
  this.first_msg = true;
  this.was_closed = false;
  this.first_non_init = true;

  var this_ = this;
  this.cid = 0;
  this.map = {};
  this.timerID = 0;
  setTimeout(function () {
    if (this_.ws.readyState !== WebSocket.OPEN) {
      this_.ws.close();
      this_.ws.onclose();
    }
  }, 7000);

  this.sendMessage = function (m, callback) {
    if (typeof callback === "undefined") callback = function (m) {};
    m = JSON.stringify(m);
    var cid = this_.cid;
    this_.cid++;
    if (typeof callback !== "undefined") this_.map[cid] = callback;
    if (this_.ws.readyState === WebSocket.OPEN) this_.ws.send(cid + ":" + m);
  };

  this.ws.onopen = function () {
    this_.ws.send("HELLO TUXLER APP");
  };

  this.ws.onmessage = function (evt) {
    var received_msg = evt.data;

    if (this_.first_msg) {
      this_.first_msg = false;

      if (received_msg === "WELCOME TO TUXLER APP") {
        if (typeof this_.onsuccess_callback !== "undefined")
          this_.onsuccess_callback(this_);
        console.log("this_.first_non_init: ", this_.first_non_init);
      } else {
        this_.ws.close();
        this_.ws.onclose();
      }
    } else {
      var idx;

      if ((idx = received_msg.indexOf(":")) === -1) {
        this_.ws.close();
        this_.ws.onclose();
      } else {
        var cid = parseInt(received_msg.substring(0, idx));
        received_msg = received_msg.substring(idx + 1);

        if (cid in this_.map) {
          var exc = false;
          var json;

          try {
            json = JSON.parse(received_msg);
          } catch (exc) {
            exc = true;
          }

          if (typeof json === "undefined") exc = true;
          else {
            for (var key in json) {
              if (json[key] == "undefined") json[key] = undefined;
            }
          }
          this_.map[cid](exc ? received_msg : json);
        } else {
          var ret = {};
          if (ParseMessage(received_msg, ret)) gotMessageApp(ret);
        }
      }
    }
    // this_.ws.close() // close instance
  };
  this.ws.onerror = function () {
    console.log(`Cannot connect to ${address}`);
  };
  this.ws.onclose = function () {
    if (!this_.was_closed) {
      this_.was_closed = true;
      if (typeof this_.onclose_callback !== "undefined")
        this_.onclose_callback(this_.inst_id);

      try {
        if (this_.timerID != 0) this_.cancelkeepalive();
      } catch (exc) {}
    }
  };
}

function startWebSocket() {
  var current_instances = ports_web_sockets.length;
  var instances = {};

  const onclose = function (i) {
    instances[i] = undefined;
    current_instances--;

    if (current_instances === 0) {
      setTimeout(function () {
        startWebSocket();
      }, 1000);
    }
  };

  const onsuccess = function (instance) {
    console.log("~onsuccess~", instance.address);
    appConnection = instance;

    App.setProxy();
    App.changeIPCountryCityNew("any", "Any", false, true);
  };

  for (let i = 0; i < ports_web_sockets.length; i++) {
    instances[i] = new AppConnection(
      "ws://127.0.0.1:" + ports_web_sockets[i] + "/tuxler",
      onclose,
      onsuccess,
      i
    );
  }
}

const App = new (class {
  constructor() {
    this._initPorts();
  }

  _initPorts() {
    let port = PORT_START;

    while (port < 65000) {
      if (port !== 12347 && port !== 23321 && port !== 23320) {
        ports_web_sockets.push(port);
      }

      port += PORT_STEP;
    }
  }

  start() {
    interval_ = setInterval(task, 5000);
    task();
  }

  setProxy() {
    console.log("~setProxy~: ", CMD_SET_PROXY);
    this.sendMessage(CMD_SET_PROXY);
  }

  unsetProxy() {
    this.sendMessage(CMD_UNSET_PROXY);
  }

  changeIPCountryCityNew(countryISO, city, next_nearby, is_residential) {
    const args = JSON.stringify([
      countryISO,
      city,
      next_nearby,
      is_residential,
    ]);
    console.log(
      "Message To app:",
      JSON.stringify({
        name: CMD_CHANGE_IP_COUNTRY_CITY_NEW,
        args,
      })
    );
    this.sendMessage({
      name: CMD_CHANGE_IP_COUNTRY_CITY_NEW,
      args,
    });
  }

  changeIPCountryCity(countryISO, city, next_nearby) {
    const args = JSON.stringify([countryISO, city, next_nearby]);
    this.sendMessage({
      name: CMD_CHANGE_IP_COUNTRY_CITY,
      args,
    });
  }

  getLocalProxyAddress(callback) {
    this.sendMessage(
      {
        name: CMD_GET_LOCAL_PROXY_ADDRESS,
        args: "[]",
      },
      callback
    );
  }

  sendMessage(m, callback) {
    if (!callback) {
      callback = function (resp) {};
    }

    let exception = false;

    try {
      appConnection.sendMessage(m, callback);
    } catch (exc) {
      console.log(exc);
      exception = true;
    }

    return !exception;
  }
})();

startWebSocket();
