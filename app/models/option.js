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
// Option Model
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var OptionSchema = new Schema({
	field: {
		type: String,
        default: ''
    },
	data: {
		type: Schema.Types.Mixed,
        default: {}
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
	createdAt: {
		type: Date,
		default: new Date()
	}
});

module.exports = mongoose.model('Option', OptionSchema);