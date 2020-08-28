var modbus = require("modbus-stream");

setTimeout(function(){
    modbus.tcp.connect(502, "192.168.2.230", (err, connection) => {
        connection.readInputRegisters({
            address: 3,
            quantity: 1,
            extra: {
                unitId: 5
            }
        }, function(err, resp) {
            if(!err) {
                console.log(resp.response.data[0].toString('hex'))
            } else {
                console.log(err)
            }
        })
    });
}, 2000);