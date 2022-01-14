"use strict";

/*
 * Created with @iobroker/create-adapter v2.0.2
 */

const utils = require("@iobroker/adapter-core");
const DaikinCloud = require("daikin-cloud-private/index");
let daikinCloud;

class DaikinCloudController extends utils.Adapter {
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: "daikin-cloud-controller",
        });
        this.on("ready", this.onReady.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
        // this.on("objectChange", this.onObjectChange.bind(this));
        this.on("message", this.onMessage.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        this.log.info("Adapter ready callback.");

        if (this.config.token == null || this.config.token == "") {
            this.log.warn("Connectivity token is not defined!");
            this.terminate(11);
        }

        this._initializeDaikinCloud();
        const devices = await daikinCloud.getCloudDevices();
        this._createFolderObject("devices");

        if (devices && devices.length) {
            for (const device of devices) {
                this.log.debug("Processing : " + device.getId());
                this.setObjectNotExists("devices." + device.getId(), {
                    type: "device",
                    common: {
                        name: device.getId()
                    },
                    native: {},
                });
                this._createStateObject(
                    this._createDeviceObjectPrefix(device) + ".lastUpdated",
                    "lastUpdated",
                    "object",
                    "date",
                    false
                );
                this._createStateObject(
                    this._createDeviceObjectPrefix(device) + ".isCloudConnectionUp",
                    "isCloudConnectionUp",
                    "boolean",
                    "indicator",
                    false
                );
                this._setState(this._createDeviceObjectPrefix(device) + ".lastUpdated", JSON.stringify(device.getLastUpdated()));
                this._setState(this._createDeviceObjectPrefix(device) + ".isCloudConnectionUp", device.isCloudConnectionUp());
                this._mapAllDataPointsToObjects(device.getData(), this._createDeviceObjectPrefix(device));
            }
        }
    }

    _mapAllDataPointsToObjects(obj, path) {
        Object.keys(obj)
            .forEach(key => {
                // Sanitize key to remove leading slash
                const sanitizedKey = key.replace(/^\/+/, "");
                this.log.debug("Processing key :" + key + ":" + sanitizedKey);
                const elementPath = path + "." + sanitizedKey;
                const element = obj[key];

                if (typeof element === "object") {
                    this._mapAllDataPointsToObjects(element, elementPath);
                } else if (sanitizedKey == "value") {
                    const writteable = obj["settable"];
                    this.log.debug("Value (" + elementPath + "): settable=" + writteable + " " + element);
                    this._createStateObject(
                        elementPath,
                        sanitizedKey,
                        "object",
                        "value",
                        writteable || false
                    );
                    this._setState(elementPath, JSON.stringify(element));
                } else if (sanitizedKey == "settable") {
                    // ignore
                    this.log.debug("Ignoring (" + elementPath + "): " + element);
                } else {
                    this.log.debug("Not object (" + elementPath + "): " + element);
                    this._createStateObject(
                        elementPath,
                        sanitizedKey,
                        "object",
                        "value",
                        false
                    );
                    this._setState(elementPath, JSON.stringify(element));
                }
            });
    }

    _setState(elementPath, element) {
        this.setState(elementPath, {
            val: element,
            ack: true
        });
    }

    _createDeviceObjectPrefix(device) {
        return "devices." + device.getId();
    }

    _initializeDaikinCloud() {
        const options = {
            logger: console.log,
            logLevel: "info",
            communicationTimeout: 10000,
            communicationRetries: 3 // Amount of retries when connection timed out
        };
        daikinCloud = new DaikinCloud(JSON.parse(this.config.token), options);
        daikinCloud.on("token_update", tokenSet => {
            this.log.info("Updated daikin cloud token. ");
            this.config.token = JSON.stringify(tokenSet);
        });
    }

    _createStateObject(id, name, type, role, canWrite) {
        this.setObjectNotExists(id, {
            type: "state",
            common: {
                name: name,
                type: type,
                role: role,
                read: true,
                write: canWrite,
            },
            native: {},
        });
    }

    _createFolderObject(name) {
        this.setObjectNotExists(name, {
            type: "folder",
            common: {
                name: name
            },
            native: {},
        });
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            // Here you must clear all timeouts or intervals that may still be active
            // clearTimeout(timeout1);
            // clearTimeout(timeout2);
            // ...
            // clearInterval(interval1);

            callback();
        } catch (e) {
            callback();
        }
    }

    // If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
    // You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
    // /**
    //  * Is called if a subscribed object changes
    //  * @param {string} id
    //  * @param {ioBroker.Object | null | undefined} obj
    //  */
    // onObjectChange(id, obj) {
    //     if (obj) {
    //         // The object was changed
    //         this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
    //     } else {
    //         // The object was deleted
    //         this.log.info(`object ${id} deleted`);
    //     }
    // }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    onStateChange(id, state) {
        if (state) {
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }

    // If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.messagebox" property to be set to true in io-package.json
    //  * @param {ioBroker.Message} obj
    //  */
    onMessage(obj) {
        this.log.debug("message received: " + JSON.stringify(obj, null, "\t"));
        if (typeof obj === "object" && obj.message) {
            if (obj.command === "send") {
                // e.g. send email or pushover or whatever
                this.log.info("send command");

                // Send response in callback if required
                if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
            }
        }
    }

}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new DaikinCloudController(options);
} else {
    // otherwise start the instance directly
    new DaikinCloudController();
}