'use strict';

const Homey = require('homey');
const { HomeyAPI } = require('athom-api');

// Services
const Log = require("./Log.js");

class TemperatureMonitor extends Homey.App {

    async getApi() {
        if (!this._api) {
            this._api = await HomeyAPI.forCurrentHomey();
        }
        return this._api;
    }
	async onInit() {
        Log.info('Temperature monitor is running...');

        //this.settings = Homey.ManagerSettings.get('settings') || {};
        
    }

    async getDevices() {
        try {
            const api = await this.getApi();
            return await api.devices.getDevices();
        } catch (e) {
            Log.error(e);
        }
    }

    async getZones() {
        try {
            const api = await this.getApi();
            return await api.zones.getZones();
        } catch (e) {
            Log.error(e);
        }
    }

    async settingsChanged() {
        Log.info("Settings changed");
        //this.settings = Homey.ManagerSettings.get('settings') || {};
        //Log.debug(this.settings);
    }
}

module.exports = TemperatureMonitor;