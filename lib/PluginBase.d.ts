/// <reference path="types.d.ts" />
export = PluginBase;
/**
 * Base class for ioBroker Plugins
 */
declare class PluginBase {
    /**
     * Constructor for Plugin class
     * This method is called by js-controller/adapter process internally when initializing the plugin.
     *
     * @param {import("@iobroker/plugin-base/types").PluginSettings} settings
     */
    constructor(settings: import("@iobroker/plugin-base/types").PluginSettings);
    pluginScope: "adapter" | "controller";
    parentNamespace: string;
    pluginNamespace: string;
    log: import("./NamespaceLogger");
    iobrokerConfig: Record<string, any>;
    parentPackage: Record<string, any>;
    settings: import("@iobroker/plugin-base/types").PluginSettings;
    objectsDb: any;
    statesDb: any;
    isActive: boolean;
    SCOPES: {
        ADAPTER: string;
        CONTROLLER: string;
    };
    /**
     * Method for Plugin developer to initialize his Plugin
     *
     * @param {Record<string, any>} pluginConfig plugin configuration from config files
     * @param {import("@iobroker/plugin-base/types").InitCallback} callback Will be called when done. On err or `initSuccessful === false` the plugin instance will be discarded.
     */
    init(pluginConfig: Record<string, any>, callback: import("@iobroker/plugin-base/types").InitCallback): void;
    /**
     * Method which is called on a clean end of the process to pot. clean up used resources
     *
     * @return {boolean} The return value indicates if the exit was successful. If no action needs to be taken, you should return true.
     */
    destroy(): boolean;
    /**
     * Get a State from State DB
     *
     * @param {string} id id of the state to retrieve
     * @param {ioBroker.GetStateCallback} callback Will be called with the result
     */
    getState(id: string, callback: ioBroker.GetStateCallback): void;
    /**
     * Get a State from State DB
     *
     * @param {string} id id of the state to retrieve
     * @return {ReturnType<ioBroker.Adapter["getStateAsync"]>} Promise with error or result
     */
    getStateAsync(id: string): Promise<ioBroker.State>;
    /**
     * Set a State in State DB
     *
     * @param {string} id id of the state to set
     * @param {Partial<ioBroker.State>} state state value to set
     * @param {ioBroker.SetStateCallback} [callback] Will be called with the result
     */
    setState(id: string, state: Partial<ioBroker.State>, callback?: ioBroker.SetStateCallback): void;
    /**
     * Set a State in State DB
     *
     * @param {string} id id of the state to set
     * @param {Partial<ioBroker.State>} state state value to set
     * @return {Promise<ioBroker.State | null | undefined>} Promise with error or result
     */
    setStateAsync(id: string, state: Partial<ioBroker.State>): Promise<ioBroker.State>;
    /**
     * Get an Object from Objects DB
     *
     * @param {string} id id of the object to retrieve
     * @param {ioBroker.GetObjectCallback} callback Will be called with the result
     */
    getObject(id: string, callback: ioBroker.GetObjectCallback): void;
    /**
     * Get an Object from Objects DB
     *
     * @param {string} id id of the object to retrieve
     * @return {Promise<ioBroker.Object | null | undefined>} Promise with result or error
     */
    getObjectAsync(id: string): Promise<ioBroker.Object>;
    /**
     * Set an Object in Objects DB
     *
     * @param {string} id id of the object to set
     * @param {ioBroker.Object} obj object to set
     * @param {ioBroker.SetObjectCallback} [callback] Will be called with the result
     */
    setObject(id: string, obj: ioBroker.Object, callback?: ioBroker.SetObjectCallback): void;
    /**
     * Set an Object in Objects DB
     *
     * @param {string} id id of the object to set
     * @param {ioBroker.Object} obj object to set
     * @return {ReturnType<ioBroker.Adapter["setObjectAsync"]>} Promise with error or result
     */
    setObjectAsync(id: string, obj: ioBroker.Object): Promise<{
        id: string;
    }>;
    /**
     * Set/Extend an Object in Objects DB
     *
     * @param {string} id id of the object to set/extend
     * @param {ioBroker.Object} obj object to set
     * @param {ioBroker.ExtendObjectCallback} [callback] Will be called with the result
     */
    extendObject(id: string, obj: ioBroker.Object, callback?: ioBroker.ExtendObjectCallback): void;
    /**
     * Set/Extend an Object in Objects DB
     *
     * @param {string} id id of the object to set/extend
     * @param {object} obj object to set
     * @return {ReturnType<ioBroker.Adapter["extendObjectAsync"]>} Promise with result or error
     */
    extendObjectAsync(id: string, obj: any): Promise<{
        id: string;
    }>;
    /****************************************
     * Internal methods!!
     ****************************************/
    /**
     * @internal
     * Set the Active flag for the plugin
     *
     * @param {boolean} active true/false if active
     */
    setActive(active: boolean): Promise<void>;
    /**
     * @internal
     * Set the objects and states database to be used internally
     * This method is called by js-controller/adapter process internally when initializing the plugin.
     *
     * @param {any} objectsDb objects DB instance
     * @param {any} statesDb states DB instance
     */
    setDatabase(objectsDb: any, statesDb: any): void;
    /**
     * @internal
     * Initialize plugin, internal method
     *
     * @param {Record<string, any>} pluginConfig plugin configuration from config files
     * @param {Record<string, any>} parentConfig io-package from parent module where plugin is used in
     * @param {import("@iobroker/plugin-base/types").InitCallback} callback Will be called when done. On err or `initSuccessful === false` the plugin instance will be discarded.
     */
    initPlugin(pluginConfig: Record<string, any>, parentConfig: Record<string, any>, callback: import("@iobroker/plugin-base/types").InitCallback): Promise<void>;
    parentIoPackage: Record<string, any>;
    /**
     * @internal
     * @param {Record<string, any>} pluginConfig
     * @param {string | boolean} activate
     * @param {import("@iobroker/plugin-base/types").InitCallback} callback
     */
    _initialize(pluginConfig: Record<string, any>, activate: string | boolean, callback: import("@iobroker/plugin-base/types").InitCallback): Promise<void>;
}
