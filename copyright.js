var glob = require('glob');
var fs = require('fs');
var copyrightText = `/**
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
`;
var files = glob.sync('**/*.js', {ignore: '**node_modules/**'});
// console.log(JSON.stringify(files))
files.forEach(file => {
	fs.writeFileSync(file, copyrightText + fs.readFileSync(file).toString())
});