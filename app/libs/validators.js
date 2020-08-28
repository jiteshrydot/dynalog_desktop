/**
 * Copyright (C) 2020 RyDOT Infotech Pvt. Ltd - All Rights Reserved
 *
 * CONFIDENTIAL
 *
 * All information contained herein is, and remains the property of RyDOT Infotech Pvt. Ltd and its partners,
 * if any. The intellectual and technical concepts contained herein are proprietary to RyDOT Infotech Pvt. Ltd and its
 * partners and may be covered by their and Foreign Patents, patents in process, and are protected by trade secret or
 * copyright law. Dissemination of this information or reproduction of this material is strictly forbidden unless
 * prior written permission is obtained from RyDOT Infotech Pvt. Ltd.
**/
var mongoose = require('mongoose')

module.exports = {
    isArray: isArray,
    isBoolean: isBoolean,
    isNumber: isNumber,
    isObject: isObject,
    isObjectID: isObjectID,
    isString: isString,
    isEmail: isEmail,
    isURL: isURL,
    isFromList: isFromList,
    isArrayOfStrings: isArrayOfStrings,
    isArrayOfEmails: isArrayOfEmails,
    isArrayOfObjectIDs: isArrayOfObjectIDs,
    isUniqueName: isUniqueName,
    isValidDeviceType: isValidDeviceType,
    isValidMessageType: isValidMessageType,
    isValidRoadsideEquipment: isValidRoadsideEquipment,
    isValidZone: isValidZone
}

function isArray(value) {
    return Array.isArray(value)
}

function isObject(value) {
    return typeof value == 'object'
}

function isBoolean(value) {
    return typeof value == 'boolean'
}

function isNumber(value) {
    return typeof value == 'number'
}

function isArrayOfObjectIDs(value) {
    if (!isArray(value)) {
        return false
    }

    var allOk = true

    value.forEach(element => {
        if (!isObjectID(element)) {
            allOk = false
        }
    })

    return allOk
}

function isArrayOfStrings(value) {
    if (!isArray(value)) {
        return false
    }

    var allOk = true

    value.forEach(element => {
        if (!isString(element)) {
            allOk = false
        }
    })

    return allOk
}

function isArrayOfEmails(value) {
    if (!isArray(value)) {
        return false
    }

    var allOk = true

    value.forEach(element => {
        if (!isEmail(element)) {
            allOk = false
        }
    })

    return allOk
}

function isObjectID(value) {
    return (!value && this.options && this.options.length && this.options.length > 0 && this.options[0].allowNull) || (value && /^[a-f\d]{24}$/.test(value))
}

function isString(value) {
    return (!value && this.options && this.options.length && this.options.length > 0 && this.options[0].allowNull) || typeof value == 'string'
}

function isEmail(value) {
    return (!value && this.options && this.options.length && this.options.length > 0 && this.options[0].allowNull) || (value && /^(([^<>()\[\]\\.,:\s@"]+(\.[^<>()\[\]\\.,:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(value))
}

function isURL(value) {
    return (!value && this.options && this.options.length && this.options.length > 0 && this.options[0].allowNull) || (value && /^((http[s]?|ftp):\/)?\/?([^:\/\s]+)((\/\w+)*\/)([\w\-\.]+[^#?\s]+)(.*)?(#[\w\-]+)?$/.test(value))
}

function isFromList(value) {
    if (!this.options || this.options.length === 0 || !this.options[0].list || !this.options[0].list.length === 0) {
        return false
    }

    return this.options[0].list.indexOf(value) > -1
}

function isUniqueUser(field, value) {

    var where = {
        isDeleted: false
    }
    where[field] = value

    return _dbPromise.apply(this, ['User', where, true])
}

/**
 * 
 */
function _dbPromise(req, model, condition, inverse) {
    // return _dbPromise.apply(this, [req, 'DeviceType', where, value]);


    return new Promise(function (resolve, reject) {
        req.mongoose.models[model].count(condition).then(function (count) {
            if (count > 0) {
                if (!inverse) resolve()
                else reject(new Error(`${model} exist`))
            } else {
                if (!inverse) reject(new Error(`${model} does not exist`))
                else resolve()
            }
        }).catch(function (err) {

            reject(err)
        })
    })
}

function _dbPromiseCompare(model, condition, value, inverse) {

    return new Promise(function (resolve, reject) {
        mongoose.models[model].count(condition).then(function (count) {
            if (count === value.length) {
                if (!inverse) resolve()
                else reject(new Error(`${model} exist`))
            } else {
                if (!inverse) reject(new Error(`${model} does not exist`))
                else resolve()
            }
        }).catch(function (err) {

            reject(err)
        })
    })
}

function _isValidModel(req, model, value) {
    // function _isValidModel(model, value) {
    // _dbPromise(req, model, condition, inverse) 
    return _dbPromise.apply(this, [model, {
        _id: value,
        isDeleted: false
    }])
}

function isUniqueName(value, { req }) {
    var where = {
        isDeleted: false
    };
    where.name = value;
    return _dbPromise.apply(this, [req, 'Rule', where, true]);
}

function isValidDeviceType(value, { req }) {
    if (!isObjectID(value)) {
        return false;
    }

    var where = {
        _id: value,
        isDeleted: false
    }

    return _dbPromise.apply(this, [req, 'DeviceType', where, false]);
}

function isValidMessageType(value, { req }) {
    if (!isObjectID(value)) {
        return false;
    }

    var where = {
        _id: value,
        isDeleted: false
    }

    return _dbPromise.apply(this, [req, 'MessageType', where, false]);
}

function isValidRoadsideEquipment(value, { req }) {
    if (!isObjectID(value)) {
        return false;
    }

    var where = {
        _id: value,
        isDeleted: false
    }

    return _dbPromise.apply(this, [req, 'RoadsideEquipment', where, false]);
}

function isValidZone(value, { req }) {
    if (!isObjectID(value)) {
        return false;
    }

    var where = {
        _id: value,
        isDeleted: false
    }

    return _dbPromise.apply(this, [req, 'Zone', where, false]);
}