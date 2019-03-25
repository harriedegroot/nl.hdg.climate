'use strict';
const Log = require('./Log');
const Homey = require('homey');

module.exports = [
    {
        description: 'Retrieve all devices with their information',
        method: 'GET',
        path: '/devices',
        role: 'owner',
        requires_authorization: true,
        fn: function (args, callback) {
            if (Homey && Homey.app) {
                Homey.app.getDevices()
                    .then(res => {
                        callback(null, res);
                    })
                    .catch(error => {
                        Log.error(error);
                        callback(error, null);
                    });
            } else {
                callback('App not ready, please try again');
            }
        }
    },
    {
        description: 'Retrieve all zones with their information',
        method: 'GET',
        path: '/zones',
        role: 'owner',
        requires_authorization: true,
        fn: function (args, callback) {
            if (Homey && Homey.app) {
                Homey.app.getZones()
                    .then(res => {
                        callback(null, res);
                    })
                    .catch(error => {
                        Log.error(error);
                        callback(error, null);
                    });
            } else {
                callback('App not ready, please try again');
            }
        }
    },
    {
        description: 'Settings changed',
        method: 'GET',
        path: '/settings_changed',
        role: 'owner',
        requires_authorization: true,
        fn: function (args, callback) {
            if (Homey && Homey.app) {
                let result = Homey.app.settingsChanged();
                if (result instanceof Error) callback(result);
                else callback(null, result);
            } else {
                callback('App not ready, please try again');
            }
        }
    },
    {
        description: 'Log lines',
        method: 'GET',
        path: '/log',
        role: 'owner',
        requires_authorization: true,
        fn: function (args, callback) {
            if (Homey && Homey.app) {
                let result = Log.getLogLines();
                if (result instanceof Error) callback(result);
                else callback(null, result);
            } else {
                callback(null, []);
            }
        }
    },
    {
        description: 'Set target value',
        method: 'POST',
        path: '/value',
        role: 'owner',
        requires_authorization: true,
        fn: function (args, callback) {
            Log.debug(args);
            if (Homey && Homey.app) {
                let deviceId = args.body.device;
                let value = args.body.target;
                Homey.app.setTargetValue(deviceId, value)
                    .then(() => callback(null, value))
                    .catch(error => {
                        Log.error(error);
                        callback('Failed to update target temperature');
                    });
            } else {
                callback("App not yet initialized", value);
            }
        }
    }
];
