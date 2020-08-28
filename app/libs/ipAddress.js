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
const ipAddress = {}

ipAddress.getIPAddress = function(req) {
	let ip_address = false
	const x_forwarded_for = req.headers['x-forwarded-for'] || ''
	const x_real_ip = req.headers['x-real-ip'] || ''

	if(x_real_ip !== '') {
		ip_address = x_real_ip

	} else if(x_forwarded_for !== '') {
		ip_address = x_forwarded_for.replace('::ffff:', '')
	}

	if(ip_address === false) {
		ip_address = '0.0.0.0'
	}

	if (ip_address.indexOf(',') > -1) {
		const x = ip_address.split(',')
		ip_address = x[x.length - 1].trim()
	}

	if(ip_address === '0.0.0.0' && req.connection.remoteAddress) {
		return req.connection.remoteAddress;
	}

	return ip_address
}

ipAddress.getInternalIPAddress = function(req) {
	
	return req.connection.remoteAddress
}

module.exports = ipAddress