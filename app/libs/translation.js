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
const _path = require('path'),
    ejs = require('ejs'),
    fs = require('fs')

module.exports = {
    translate: translate
}

/**
 * Get the value of given path from i11n/{lang}.json file
 * @param {Object} req
 * @param {string} path Required parameter passed to find the specific path from language file
 * @param {Object} [data] Optional parameter passed to make translation dynamic
 * @param {string} [lang=en] Optional parameter passed to get translation to specific language
 * @return {string}
 */
function translate(req, path, data = {}, lang) {
    const translationData = getTranslationData(req, lang)
    if(!translationData) {
        return path
    }

    const value = path + ''
    const parts = path.split('.')
    let returnVal = {...translationData}
    let terminateFetching = false

    parts.forEach(function(part) {
        
        if(!terminateFetching) {
            if(typeof returnVal[part] != 'undefined') {
                returnVal = returnVal[part]
            } else {
                terminateFetching = true
            }
        }
    })

    if(returnVal && typeof returnVal == 'string' && returnVal != value && JSON.stringify(returnVal) != JSON.stringify(translationData)) {
        return ejs.render(returnVal, data)
    }

    return value
}

function getTranslationData(req, lang) {
    const pathToTranslationFile = _path.join(__dirname, '../i11n', (lang ? lang : (req.lang ? req.lang : 'en')) + '.json')
    if(!fs.existsSync(pathToTranslationFile)) {
        return null
    }
    
    return require(pathToTranslationFile)
}