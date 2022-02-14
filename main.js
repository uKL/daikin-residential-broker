"use strict";

/*
 * Created with @iobroker/create-adapter v2.0.2
 */

const utils = require("@iobroker/adapter-core");
const DaikinCloud = require("daikin-cloud-private/index");
let daikinCloud;
let pollingTimer;

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

        if (this.config.pollingInterval == null || this.config.pollingInterval == 0) {
            this.log.warn("Connectivity interval is not defined!");
            this.terminate(11);
        }

        this._initializeDaikinCloud();
        this._createFolderObject("devices");

        const t = this;
        pollingTimer = this.setInterval(async function () {
            await t._updateDataHandlingErrors();
        }, this.config.pollingInterval * 1000);
        await t._updateDataHandlingErrors();
    }

    async _updateDataHandlingErrors() {

        try {
            return this._updateData();
        } catch (error) {
            this.log.debug("Communication error : " + error);
        }
    }

    async _updateData() {
        this.log.info("Updating data from the cloud.");
        const devices = await daikinCloud.getCloudDevices();

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
                this._setState(this._createDeviceObjectPrefix(device) + ".lastUpdated", device.getDescription().lastUpdateReceived);
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
                    this._setState(elementPath, element);
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
                    this._setState(elementPath, element);
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
            if (pollingTimer) {
                this.clearInterval(pollingTimer);
                pollingTimer = null;
            }
            callback();
        } catch (e) {
            callback();
        }
    }

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