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
module.exports = {
    allDatesOfMonth: allDatesOfMonth,
    formatYMD: formatYMD
}

function allDatesOfMonth(year, month) {
    var date = new Date(year, (month - 1), 1);
    var days = [];
    while(date.getMonth() === month) {
       days.push(date);
       date.setDate(date.getDate() + 1);
    }
    return days;
}

function formatYMD(d) {
    return [d.getFullYear(), preZero(d.getMonth() + 1, 1), preZero(d.getDate() + 1, 1)].join('');
}

function preZero(num, pow) {
    if(num < Math.pow(10, pow)) {
        return ['0'.repeat(pow), num].join('');
    }
    return num;
}